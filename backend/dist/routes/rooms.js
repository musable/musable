"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createRoomRoutes;
const express_1 = __importDefault(require("express"));
const Room_1 = require("../models/Room");
const auth_1 = require("../middleware/auth");
function createRoomRoutes(io) {
    const router = express_1.default.Router();
    router.get('/public', auth_1.authenticateToken, async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);
            const offset = (page - 1) * limit;
            const rooms = await Room_1.RoomModel.getPublicRooms(limit, offset);
            const userId = req.user?.id;
            const roomsWithParticipation = await Promise.all(rooms.map(async (room) => {
                if (userId) {
                    const isParticipant = await Room_1.RoomModel.isUserInRoom(room.id, userId);
                    const userRole = isParticipant ? await Room_1.RoomModel.getUserRole(room.id, userId) : null;
                    return {
                        ...room,
                        isParticipant,
                        userRole
                    };
                }
                return room;
            }));
            res.json({
                rooms: roomsWithParticipation,
                pagination: {
                    page,
                    limit,
                    hasMore: rooms.length === limit
                }
            });
            return;
        }
        catch (error) {
            console.error('Error fetching public rooms:', error);
            res.status(500).json({ error: 'Failed to fetch public rooms' });
            return;
        }
    });
    router.get('/my-rooms', auth_1.authenticateToken, async (req, res) => {
        try {
            const rooms = await Room_1.RoomModel.getUserRooms(req.user.id);
            res.json({ rooms });
            return;
        }
        catch (error) {
            console.error('Error fetching user rooms:', error);
            res.status(500).json({ error: 'Failed to fetch user rooms' });
            return;
        }
    });
    router.get('/:id', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            if (isNaN(roomId)) {
                res.status(400).json({ error: 'Invalid room ID' });
                return;
            }
            const room = await Room_1.RoomModel.findById(roomId);
            if (!room) {
                res.status(404).json({ error: 'Room not found' });
                return;
            }
            const [participants, queue] = await Promise.all([
                Room_1.RoomModel.getParticipants(roomId),
                Room_1.RoomModel.getQueue(roomId)
            ]);
            res.json({
                room,
                participants,
                queue
            });
            return;
        }
        catch (error) {
            console.error('Error fetching room details:', error);
            res.status(500).json({ error: 'Failed to fetch room details' });
            return;
        }
    });
    router.get('/code/:code', async (req, res) => {
        try {
            const code = req.params.code.toUpperCase();
            if (code.length !== 6) {
                res.status(400).json({ error: 'Invalid room code format' });
                return;
            }
            const room = await Room_1.RoomModel.findByCode(code);
            if (!room) {
                res.status(404).json({ error: 'Room not found' });
                return;
            }
            res.json({
                id: room.id,
                name: room.name,
                description: room.description,
                code: room.code,
                host: room.host,
                participant_count: await Room_1.RoomModel.getParticipants(room.id).then(p => p.length),
                max_listeners: room.max_listeners,
                current_song: room.current_song,
                is_playing: room.is_playing
            });
            return;
        }
        catch (error) {
            console.error('Error finding room by code:', error);
            res.status(500).json({ error: 'Failed to find room' });
            return;
        }
    });
    router.post('/', auth_1.authenticateToken, async (req, res) => {
        try {
            const { name, description, is_public, max_listeners } = req.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                res.status(400).json({ error: 'Room name is required' });
                return;
            }
            if (name.length > 255) {
                res.status(400).json({ error: 'Room name must be 255 characters or less' });
                return;
            }
            const roomData = {
                name: name.trim(),
                description: description || null,
                host_id: req.user.id,
                is_public: Boolean(is_public),
                max_listeners: Math.max(2, Math.min(50, parseInt(max_listeners) || 10))
            };
            const room = await Room_1.RoomModel.create(roomData);
            res.status(201).json({ room });
            return;
        }
        catch (error) {
            console.error('Error creating room:', error);
            res.status(500).json({ error: 'Failed to create room' });
            return;
        }
    });
    router.post('/join', auth_1.authenticateToken, async (req, res) => {
        try {
            const { code } = req.body;
            if (!code || typeof code !== 'string' || code.length !== 6) {
                res.status(400).json({ error: 'Valid 6-character room code is required' });
                return;
            }
            const roomCode = code.toUpperCase();
            const room = await Room_1.RoomModel.findByCode(roomCode);
            if (!room) {
                res.status(404).json({ error: 'Room not found' });
                return;
            }
            const participants = await Room_1.RoomModel.getParticipants(room.id);
            const isAlreadyParticipant = participants.some(p => p.user_id === req.user.id);
            if (!isAlreadyParticipant && participants.length >= room.max_listeners) {
                res.status(400).json({ error: 'Room is full' });
                return;
            }
            await Room_1.RoomModel.addParticipant(room.id, req.user.id);
            const [updatedParticipants, queue] = await Promise.all([
                Room_1.RoomModel.getParticipants(room.id),
                Room_1.RoomModel.getQueue(room.id)
            ]);
            res.json({
                room,
                participants: updatedParticipants,
                queue
            });
            return;
        }
        catch (error) {
            console.error('Error joining room:', error);
            res.status(500).json({ error: 'Failed to join room' });
            return;
        }
    });
    router.post('/:id/leave', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            if (isNaN(roomId)) {
                res.status(400).json({ error: 'Invalid room ID' });
                return;
            }
            await Room_1.RoomModel.removeParticipant(roomId, req.user.id);
            res.json({ message: 'Left room successfully' });
            return;
        }
        catch (error) {
            console.error('Error leaving room:', error);
            res.status(500).json({ error: 'Failed to leave room' });
            return;
        }
    });
    router.post('/:id/queue', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            const songId = parseInt(req.body.song_id);
            if (isNaN(roomId) || isNaN(songId)) {
                res.status(400).json({ error: 'Invalid room ID or song ID' });
                return;
            }
            const participants = await Room_1.RoomModel.getParticipants(roomId);
            const isParticipant = participants.some(p => p.user_id === req.user.id);
            if (!isParticipant) {
                res.status(403).json({ error: 'You must be in the room to add songs' });
                return;
            }
            await Room_1.RoomModel.addToQueue(roomId, songId, req.user.id);
            const queue = await Room_1.RoomModel.getQueue(roomId);
            res.json({ queue });
            return;
        }
        catch (error) {
            console.error('Error adding to queue:', error);
            res.status(500).json({ error: 'Failed to add song to queue' });
            return;
        }
    });
    router.delete('/:id/queue/:queueId', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            const queueItemId = parseInt(req.params.queueId);
            if (isNaN(roomId) || isNaN(queueItemId)) {
                res.status(400).json({ error: 'Invalid room ID or queue item ID' });
                return;
            }
            const participants = await Room_1.RoomModel.getParticipants(roomId);
            const isParticipant = participants.some(p => p.user_id === req.user.id);
            if (!isParticipant) {
                res.status(403).json({ error: 'You must be in the room to remove songs' });
                return;
            }
            await Room_1.RoomModel.removeFromQueue(roomId, queueItemId);
            const queue = await Room_1.RoomModel.getQueue(roomId);
            res.json({ queue });
            return;
        }
        catch (error) {
            console.error('Error removing from queue:', error);
            res.status(500).json({ error: 'Failed to remove song from queue' });
            return;
        }
    });
    router.patch('/:id', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            if (isNaN(roomId)) {
                res.status(400).json({ error: 'Invalid room ID' });
                return;
            }
            const room = await Room_1.RoomModel.findById(roomId);
            if (!room) {
                res.status(404).json({ error: 'Room not found' });
                return;
            }
            if (room.host_id !== req.user.id) {
                res.status(403).json({ error: 'Only the host can update room settings' });
                return;
            }
            res.status(501).json({ error: 'Room settings update not yet implemented' });
            return;
        }
        catch (error) {
            console.error('Error updating room:', error);
            res.status(500).json({ error: 'Failed to update room' });
            return;
        }
    });
    router.patch('/:id/participants/:userId/role', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            const targetUserId = parseInt(req.params.userId);
            const { role } = req.body;
            if (isNaN(roomId) || isNaN(targetUserId)) {
                res.status(400).json({ error: 'Invalid room ID or user ID' });
                return;
            }
            if (!role || !['host', 'listener'].includes(role)) {
                res.status(400).json({ error: 'Invalid role. Must be "host" or "listener"' });
                return;
            }
            const room = await Room_1.RoomModel.findById(roomId);
            if (!room) {
                res.status(404).json({ error: 'Room not found' });
                return;
            }
            const requesterRole = await Room_1.RoomModel.getUserRole(roomId, req.user.id);
            if (requesterRole !== 'host') {
                res.status(403).json({ error: 'Only hosts can change user roles' });
                return;
            }
            const isTargetInRoom = await Room_1.RoomModel.isUserInRoom(roomId, targetUserId);
            if (!isTargetInRoom) {
                res.status(404).json({ error: 'User is not in this room' });
                return;
            }
            if (room.host_id === targetUserId && role === 'listener') {
                res.status(400).json({ error: 'Cannot demote the original room creator from host' });
                return;
            }
            await Room_1.RoomModel.updateUserRole(roomId, targetUserId, role);
            const participants = await Room_1.RoomModel.getParticipants(roomId);
            io.to(`room_${roomId}`).emit('participants_updated', {
                participants
            });
            res.json({
                success: true,
                message: `User role updated to ${role}`,
                participants
            });
            return;
        }
        catch (error) {
            console.error('Error changing user role:', error);
            res.status(500).json({ error: 'Failed to change user role' });
            return;
        }
    });
    router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
        try {
            const roomId = parseInt(req.params.id);
            if (isNaN(roomId)) {
                res.status(400).json({ error: 'Invalid room ID' });
                return;
            }
            const room = await Room_1.RoomModel.findById(roomId);
            if (!room) {
                res.status(404).json({ error: 'Room not found' });
                return;
            }
            if (room.host_id !== req.user.id && !req.user.is_admin) {
                res.status(403).json({ error: 'Only the host or an admin can delete the room' });
                return;
            }
            await Room_1.RoomModel.delete(roomId);
            res.json({ message: 'Room deleted successfully' });
            return;
        }
        catch (error) {
            console.error('Error deleting room:', error);
            res.status(500).json({ error: 'Failed to delete room' });
            return;
        }
    });
    return router;
}
//# sourceMappingURL=rooms.js.map