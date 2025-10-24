import express from 'express';
import { Server } from 'socket.io';
import type { AuthRequest } from '../middleware/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { RoomModel } from '../models/Room.js';

export default function createRoomRoutes(io: Server) {
  const router = express.Router();

  // Get all public rooms
  router.get('/public', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = (page - 1) * limit;

      const rooms = await RoomModel.getPublicRooms(limit, offset);
      const userId = req.user?.id;

      // Add participation info for each room if user is authenticated
      const roomsWithParticipation = await Promise.all(
        rooms.map(async (room) => {
          if (userId) {
            const isParticipant = await RoomModel.isUserInRoom(room.id, userId);
            const userRole = isParticipant
              ? await RoomModel.getUserRole(room.id, userId)
              : null;
            return {
              ...room,
              isParticipant,
              userRole,
            };
          }
          return room;
        }),
      );

      res.json({
        rooms: roomsWithParticipation,
        pagination: {
          page,
          limit,
          hasMore: rooms.length === limit,
        },
      });
      return;
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      res.status(500).json({ error: 'Failed to fetch public rooms' });
      return;
    }
  });

  // Get user's rooms
  router.get('/my-rooms', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const rooms = await RoomModel.getUserRooms(req.user!.id);
      res.json({ rooms });
      return;
    } catch (error) {
      console.error('Error fetching user rooms:', error);
      res.status(500).json({ error: 'Failed to fetch user rooms' });
      return;
    }
  });

  // Get room details
  router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const roomId = parseInt(req.params.id);
      if (isNaN(roomId)) {
        res.status(400).json({ error: 'Invalid room ID' });
        return;
      }

      const room = await RoomModel.findById(roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Get participants and queue
      const [participants, queue] = await Promise.all([
        RoomModel.getParticipants(roomId),
        RoomModel.getQueue(roomId),
      ]);

      res.json({
        room,
        participants,
        queue,
      });
      return;
    } catch (error) {
      console.error('Error fetching room details:', error);
      res.status(500).json({ error: 'Failed to fetch room details' });
      return;
    }
  });

  // Find room by code
  router.get('/code/:code', async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();

      if (code.length !== 6) {
        res.status(400).json({ error: 'Invalid room code format' });
        return;
      }

      const room = await RoomModel.findByCode(code);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Only return basic room info for discovery
      res.json({
        id: room.id,
        name: room.name,
        description: room.description,
        code: room.code,
        host: room.host,
        participant_count: await RoomModel.getParticipants(room.id).then(
          (p) => p.length,
        ),
        max_listeners: room.max_listeners,
        current_song: room.current_song,
        is_playing: room.is_playing,
      });
      return;
    } catch (error) {
      console.error('Error finding room by code:', error);
      res.status(500).json({ error: 'Failed to find room' });
      return;
    }
  });

  // Create a new room
  router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, description, is_public, max_listeners } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Room name is required' });
        return;
      }

      if (name.length > 255) {
        res
          .status(400)
          .json({ error: 'Room name must be 255 characters or less' });
        return;
      }

      const roomData = {
        name: name.trim(),
        description: description || null,
        host_id: req.user!.id,
        is_public: Boolean(is_public),
        max_listeners: Math.max(2, Math.min(50, parseInt(max_listeners) || 10)),
      };

      const room = await RoomModel.create(roomData);

      res.status(201).json({ room });
      return;
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room' });
      return;
    }
  });

  // Join a room
  router.post('/join', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { code } = req.body;

      if (!code || typeof code !== 'string' || code.length !== 6) {
        res
          .status(400)
          .json({ error: 'Valid 6-character room code is required' });
        return;
      }

      const roomCode = code.toUpperCase();
      const room = await RoomModel.findByCode(roomCode);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Check if room is full
      const participants = await RoomModel.getParticipants(room.id);
      const isAlreadyParticipant = participants.some(
        (p) => p.user_id === req.user!.id,
      );

      if (!isAlreadyParticipant && participants.length >= room.max_listeners) {
        res.status(400).json({ error: 'Room is full' });
        return;
      }

      // Add user as participant (or reactivate)
      await RoomModel.addParticipant(room.id, req.user!.id);

      // Get updated room data
      const [updatedParticipants, queue] = await Promise.all([
        RoomModel.getParticipants(room.id),
        RoomModel.getQueue(room.id),
      ]);

      res.json({
        room,
        participants: updatedParticipants,
        queue,
      });
      return;
    } catch (error) {
      console.error('Error joining room:', error);
      res.status(500).json({ error: 'Failed to join room' });
      return;
    }
  });

  // Leave a room
  router.post(
    '/:id/leave',
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const roomId = parseInt(req.params.id);
        if (isNaN(roomId)) {
          res.status(400).json({ error: 'Invalid room ID' });
          return;
        }

        await RoomModel.removeParticipant(roomId, req.user!.id);

        res.json({ message: 'Left room successfully' });
        return;
      } catch (error) {
        console.error('Error leaving room:', error);
        res.status(500).json({ error: 'Failed to leave room' });
        return;
      }
    },
  );

  // Add song to room queue
  router.post(
    '/:id/queue',
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const roomId = parseInt(req.params.id);
        const songId = parseInt(req.body.song_id);

        if (isNaN(roomId) || isNaN(songId)) {
          res.status(400).json({ error: 'Invalid room ID or song ID' });
          return;
        }

        // Check if user is in the room
        const participants = await RoomModel.getParticipants(roomId);
        const isParticipant = participants.some(
          (p) => p.user_id === req.user!.id,
        );

        if (!isParticipant) {
          res
            .status(403)
            .json({ error: 'You must be in the room to add songs' });
          return;
        }

        await RoomModel.addToQueue(roomId, songId, req.user!.id);

        // Get updated queue
        const queue = await RoomModel.getQueue(roomId);

        res.json({ queue });
        return;
      } catch (error) {
        console.error('Error adding to queue:', error);
        res.status(500).json({ error: 'Failed to add song to queue' });
        return;
      }
    },
  );

  // Remove song from room queue
  router.delete(
    '/:id/queue/:queueId',
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const roomId = parseInt(req.params.id);
        const queueItemId = parseInt(req.params.queueId);

        if (isNaN(roomId) || isNaN(queueItemId)) {
          res.status(400).json({ error: 'Invalid room ID or queue item ID' });
          return;
        }

        // Check if user is in the room
        const participants = await RoomModel.getParticipants(roomId);
        const isParticipant = participants.some(
          (p) => p.user_id === req.user!.id,
        );

        if (!isParticipant) {
          res
            .status(403)
            .json({ error: 'You must be in the room to remove songs' });
          return;
        }

        // TODO: Add permission check - only host or song adder can remove
        await RoomModel.removeFromQueue(roomId, queueItemId);

        // Get updated queue
        const queue = await RoomModel.getQueue(roomId);

        res.json({ queue });
        return;
      } catch (error) {
        console.error('Error removing from queue:', error);
        res.status(500).json({ error: 'Failed to remove song from queue' });
        return;
      }
    },
  );

  // Update room settings (host only)
  router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const roomId = parseInt(req.params.id);
      if (isNaN(roomId)) {
        res.status(400).json({ error: 'Invalid room ID' });
        return;
      }

      const room = await RoomModel.findById(roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Check if user is the host
      if (room.host_id !== req.user!.id) {
        res
          .status(403)
          .json({ error: 'Only the host can update room settings' });
        return;
      }

      // TODO: Implement room settings update
      res
        .status(501)
        .json({ error: 'Room settings update not yet implemented' });
      return;
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({ error: 'Failed to update room' });
      return;
    }
  });

  // Change user role in room (host only)
  router.patch(
    '/:id/participants/:userId/role',
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const roomId = parseInt(req.params.id);
        const targetUserId = parseInt(req.params.userId);
        const { role } = req.body;

        if (isNaN(roomId) || isNaN(targetUserId)) {
          res.status(400).json({ error: 'Invalid room ID or user ID' });
          return;
        }

        if (!role || !['host', 'listener'].includes(role)) {
          res
            .status(400)
            .json({ error: 'Invalid role. Must be "host" or "listener"' });
          return;
        }

        const room = await RoomModel.findById(roomId);
        if (!room) {
          res.status(404).json({ error: 'Room not found' });
          return;
        }

        // Check if the requesting user is a host in this room
        const requesterRole = await RoomModel.getUserRole(roomId, req.user!.id);
        if (requesterRole !== 'host') {
          res.status(403).json({ error: 'Only hosts can change user roles' });
          return;
        }

        // Check if target user is in the room
        const isTargetInRoom = await RoomModel.isUserInRoom(
          roomId,
          targetUserId,
        );
        if (!isTargetInRoom) {
          res.status(404).json({ error: 'User is not in this room' });
          return;
        }

        // Prevent removing the original room creator's host status
        if (room.host_id === targetUserId && role === 'listener') {
          res.status(400).json({
            error: 'Cannot demote the original room creator from host',
          });
          return;
        }

        // Update the user's role
        await RoomModel.updateUserRole(roomId, targetUserId, role);

        // Get updated participants list
        const participants = await RoomModel.getParticipants(roomId);

        // Broadcast participants update to all users in the room via WebSocket
        io.to(`room_${roomId}`).emit('participants_updated', {
          participants,
        });

        res.json({
          success: true,
          message: `User role updated to ${role}`,
          participants,
        });
        return;
      } catch (error) {
        console.error('Error changing user role:', error);
        res.status(500).json({ error: 'Failed to change user role' });
        return;
      }
    },
  );

  // Delete room (host only)
  router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const roomId = parseInt(req.params.id);
      if (isNaN(roomId)) {
        res.status(400).json({ error: 'Invalid room ID' });
        return;
      }

      const room = await RoomModel.findById(roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Check if user is the host or an admin
      if (room.host_id !== req.user!.id && !req.user!.is_admin) {
        res
          .status(403)
          .json({ error: 'Only the host or an admin can delete the room' });
        return;
      }

      await RoomModel.delete(roomId);

      res.json({ message: 'Room deleted successfully' });
      return;
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ error: 'Failed to delete room' });
      return;
    }
  });

  return router;
}
