import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RoomModel, Room, RoomParticipant } from '../models/Room';
import { UserWithoutPassword, UserModel } from '../models/User';

interface AuthenticatedSocket extends Socket {
  user?: UserWithoutPassword;
  currentRoom?: string;
}

interface RoomState {
  id: number;
  current_song_id?: number;
  current_position: number;
  is_playing: boolean;
  play_started_at?: Date;
  last_update: Date;
}

export interface PlaybackSyncEvent {
  type: 'play' | 'pause' | 'seek' | 'song_change';
  song_id?: number;
  position?: number;
  timestamp: number;
  user_id: number;
}

export interface ChatMessage {
  id: string;
  user_id: number;
  username: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'song_change';
}

export class RoomService {
  private io: Server;
  private roomStates: Map<number, RoomState> = new Map();
  
  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🎵 User ${socket.user?.username} connected to room service`);

      // Join room
      socket.on('join_room', async (data: { roomCode: string }) => {
        await this.handleJoinRoom(socket, data.roomCode);
      });

      // Leave room
      socket.on('leave_room', async () => {
        await this.handleLeaveRoom(socket);
      });

      // Playback controls
      socket.on('room_play', async (data: { song_id?: number; position?: number }) => {
        await this.handlePlaybackControl(socket, 'play', data);
      });

      socket.on('room_pause', async () => {
        await this.handlePlaybackControl(socket, 'pause', {});
      });

      socket.on('room_seek', async (data: { position: number }) => {
        await this.handlePlaybackControl(socket, 'seek', data);
      });

      socket.on('room_song_change', async (data: { song_id: number }) => {
        await this.handlePlaybackControl(socket, 'song_change', data);
      });

      // Queue management
      socket.on('add_to_queue', async (data: { song_id: number }) => {
        await this.handleAddToQueue(socket, data.song_id);
      });

      socket.on('add_to_queue_top', async (data: { song_id: number }) => {
        await this.handleAddToQueueTop(socket, data.song_id);
      });

      socket.on('remove_from_queue', async (data: { queue_item_id: number }) => {
        await this.handleRemoveFromQueue(socket, data.queue_item_id);
      });

      // Chat
      socket.on('room_chat', async (data: { message: string }) => {
        await this.handleChatMessage(socket, data.message);
      });

      // Request room sync
      socket.on('request_sync', async () => {
        await this.sendRoomSync(socket);
      });

      // Disconnect
      socket.on('disconnect', async () => {
        console.log(`🎵 User ${socket.user?.username} disconnected from room service`);
        await this.handleLeaveRoom(socket);
      });
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      console.log('🔍 WebSocket auth debug - Token received:', token ? 'YES' : 'NO');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      console.log('🔍 WebSocket auth debug - Decoded JWT:', { id: decoded.id, userId: decoded.userId, exp: decoded.exp });
      
      const userModel = new UserModel();
      const user = await userModel.findById(decoded.id);
      
      console.log('🔍 WebSocket auth debug - User found:', user ? `YES (${user.username})` : 'NO');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('🔍 WebSocket auth debug - Authentication error:', error instanceof Error ? error.message : String(error));
      next(new Error('Authentication failed'));
    }
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, roomCode: string): Promise<void> {
    try {
      if (!socket.user) return;

      const room = await RoomModel.findByCode(roomCode);
      if (!room) {
        socket.emit('room_error', { message: 'Room not found' });
        return;
      }

      // Check if room is full
      const participants = await RoomModel.getParticipants(room.id);
      if (participants.length >= room.max_listeners && !participants.some(p => p.user_id === socket.user!.id)) {
        socket.emit('room_error', { message: 'Room is full' });
        return;
      }

      // Leave current room if any
      if (socket.currentRoom) {
        await this.handleLeaveRoom(socket);
      }

      // Join the room
      await RoomModel.addParticipant(room.id, socket.user.id);
      socket.join(`room_${room.id}`);
      socket.currentRoom = `room_${room.id}`;

      // Update room state if not exists
      if (!this.roomStates.has(room.id)) {
        this.roomStates.set(room.id, {
          id: room.id,
          current_song_id: room.current_song_id,
          current_position: room.current_position,
          is_playing: room.is_playing,
          play_started_at: room.play_started_at ? new Date(room.play_started_at) : undefined,
          last_update: new Date()
        });
      }

      // Send room data to the user
      const roomData = await this.getRoomData(room.id);
      socket.emit('room_joined', roomData);

      // Send sync state
      await this.sendRoomSync(socket);

      // Get updated participants list
      const updatedParticipants = await RoomModel.getParticipants(room.id);
      
      // Notify all participants (including the new one) about the updated participant list
      this.io.to(`room_${room.id}`).emit('participants_updated', {
        participants: updatedParticipants
      });
      
      // Notify other participants about the new user (for chat/toast)
      socket.to(`room_${room.id}`).emit('user_joined', {
        user: {
          id: socket.user.id,
          username: socket.user.username
        }
      });

      console.log(`🎵 User ${socket.user.username} joined room ${room.name} (${room.code})`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room_error', { message: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!socket.user || !socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      
      // Remove from database
      await RoomModel.removeParticipant(roomId, socket.user.id);
      
      // Check if this was the last participant
      const remainingParticipants = await RoomModel.getParticipants(roomId);
      console.log(`🎵 After ${socket.user.username} left room ${roomId}, remaining participants: ${remainingParticipants.length}`);
      
      if (remainingParticipants.length === 0) {
        // This was the last person - delete the room
        try {
          await RoomModel.delete(roomId);
          
          // Remove room state
          this.roomStates.delete(roomId);
          
          console.log(`🎵 Room ${roomId} auto-deleted - last participant left`);
        } catch (deleteError) {
          console.error(`🎵 Failed to auto-delete room ${roomId}:`, deleteError);
        }
      } else {
        // Notify all remaining participants about the updated participant list
        this.io.to(`room_${roomId}`).emit('participants_updated', {
          participants: remainingParticipants
        });
        
        // Notify other participants about the user leaving (for chat/toast)
        socket.to(socket.currentRoom).emit('user_left', {
          user: {
            id: socket.user.id,
            username: socket.user.username
          }
        });
        
        console.log(`🎵 Notified ${remainingParticipants.length} participants about ${socket.user.username} leaving room ${roomId}`);
      }
      
      // Leave socket room
      socket.leave(socket.currentRoom);
      socket.currentRoom = undefined;
      
      console.log(`🎵 User ${socket.user.username} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  private async handlePlaybackControl(
    socket: AuthenticatedSocket, 
    type: PlaybackSyncEvent['type'], 
    data: any
  ): Promise<void> {
    try {
      if (!socket.user || !socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      const room = await RoomModel.findById(roomId);
      
      if (!room) return;

      // Check if user is host (only host can control playback)
      if (room.host_id !== socket.user.id) {
        socket.emit('room_error', { message: 'Only the host can control playback' });
        return;
      }

      const now = new Date();
      const timestamp = now.getTime();
      let roomState = this.roomStates.get(roomId);
      
      if (!roomState) {
        roomState = {
          id: roomId,
          current_song_id: room.current_song_id,
          current_position: room.current_position,
          is_playing: room.is_playing,
          play_started_at: room.play_started_at ? new Date(room.play_started_at) : undefined,
          last_update: now
        };
        this.roomStates.set(roomId, roomState);
      }

      // Calculate current position if playing
      if (roomState.is_playing && roomState.play_started_at) {
        const elapsedSeconds = (now.getTime() - roomState.play_started_at.getTime()) / 1000;
        roomState.current_position = Math.max(0, roomState.current_position + elapsedSeconds);
      }

      // Apply the control
      switch (type) {
        case 'play':
          if (data.song_id && data.song_id !== roomState.current_song_id) {
            roomState.current_song_id = data.song_id;
            roomState.current_position = 0;
          }
          if (data.position !== undefined) {
            roomState.current_position = data.position;
          }
          roomState.is_playing = true;
          roomState.play_started_at = now;
          break;
          
        case 'pause':
          roomState.is_playing = false;
          roomState.play_started_at = undefined;
          break;
          
        case 'seek':
          roomState.current_position = data.position;
          if (roomState.is_playing) {
            roomState.play_started_at = now;
          }
          break;
          
        case 'song_change':
          roomState.current_song_id = data.song_id;
          roomState.current_position = 0;
          roomState.is_playing = true;
          roomState.play_started_at = now;
          break;
      }

      roomState.last_update = now;

      // Update database
      await RoomModel.updatePlaybackState(roomId, {
        current_song_id: roomState.current_song_id,
        current_position: roomState.current_position,
        is_playing: roomState.is_playing,
        play_started_at: roomState.play_started_at?.toISOString()
      });

      // Broadcast to all room participants
      const syncEvent: PlaybackSyncEvent = {
        type,
        song_id: roomState.current_song_id,
        position: roomState.current_position,
        timestamp,
        user_id: socket.user.id
      };

      this.io.to(`room_${roomId}`).emit('playback_sync', syncEvent);

      console.log(`🎵 Room ${roomId} playback control: ${type} by ${socket.user.username}`);
    } catch (error) {
      console.error('Error handling playback control:', error);
      socket.emit('room_error', { message: 'Failed to control playback' });
    }
  }

  private async handleAddToQueue(socket: AuthenticatedSocket, songId: number): Promise<void> {
    try {
      if (!socket.user || !socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      
      await RoomModel.addToQueue(roomId, songId, socket.user.id);
      
      // Get updated queue
      const queue = await RoomModel.getQueue(roomId);
      
      // Broadcast updated queue to all participants
      this.io.to(`room_${roomId}`).emit('queue_updated', { queue });
      
      console.log(`🎵 Song ${songId} added to room ${roomId} queue by ${socket.user.username}`);
    } catch (error) {
      console.error('Error adding to queue:', error);
      socket.emit('room_error', { message: 'Failed to add song to queue' });
    }
  }

  private async handleAddToQueueTop(socket: AuthenticatedSocket, songId: number): Promise<void> {
    try {
      if (!socket.user || !socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      
      await RoomModel.addToQueueTop(roomId, songId, socket.user.id);
      
      // Get updated queue
      const queue = await RoomModel.getQueue(roomId);
      
      // Broadcast updated queue to all participants
      this.io.to(`room_${roomId}`).emit('queue_updated', { queue });
      
      // Automatically play the song that was added to top
      await this.handlePlaybackControl(socket, 'song_change', { song_id: songId });
      
      console.log(`🎵 Song ${songId} added to TOP of room ${roomId} queue and playing by ${socket.user.username}`);
    } catch (error) {
      console.error('Error adding to queue top:', error);
      socket.emit('room_error', { message: 'Failed to add song to queue' });
    }
  }

  private async handleRemoveFromQueue(socket: AuthenticatedSocket, queueItemId: number): Promise<void> {
    try {
      if (!socket.user || !socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      
      // Get the queue item to check permissions
      const queueItem = await RoomModel.getQueueItem(roomId, queueItemId);
      if (!queueItem) {
        socket.emit('room_error', { message: 'Queue item not found' });
        return;
      }
      
      // Get room to check if user is host
      const room = await RoomModel.findById(roomId);
      if (!room) {
        socket.emit('room_error', { message: 'Room not found' });
        return;
      }
      
      // Permission check: host can delete any item, users can only delete their own
      const isHost = room.host_id === socket.user.id;
      const isOwner = queueItem.added_by === socket.user.id;
      
      if (!isHost && !isOwner) {
        socket.emit('room_error', { message: 'You can only remove songs you added to the queue' });
        return;
      }
      
      await RoomModel.removeFromQueue(roomId, queueItemId);
      
      // Get updated queue
      const queue = await RoomModel.getQueue(roomId);
      
      // Broadcast updated queue to all participants
      this.io.to(`room_${roomId}`).emit('queue_updated', { queue });
      
      console.log(`🎵 Queue item ${queueItemId} removed from room ${roomId} by ${socket.user.username} (${isHost ? 'host' : 'owner'})`);
    } catch (error) {
      console.error('Error removing from queue:', error);
      socket.emit('room_error', { message: 'Failed to remove song from queue' });
    }
  }

  private async handleChatMessage(socket: AuthenticatedSocket, message: string): Promise<void> {
    try {
      if (!socket.user || !socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      
      const chatMessage: ChatMessage = {
        id: `${Date.now()}_${socket.user.id}`,
        user_id: socket.user.id,
        username: socket.user.username,
        message: message.trim(),
        timestamp: Date.now(),
        type: 'chat'
      };

      // Broadcast to all room participants
      this.io.to(`room_${roomId}`).emit('room_chat', chatMessage);
      
      // TODO: Store in database if needed
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  }

  private async sendRoomSync(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!socket.currentRoom) return;

      const roomId = parseInt(socket.currentRoom.replace('room_', ''));
      const roomState = this.roomStates.get(roomId);
      
      if (!roomState) return;

      const now = new Date();
      let currentPosition = roomState.current_position;
      
      // Calculate current position if playing
      if (roomState.is_playing && roomState.play_started_at) {
        const elapsedSeconds = (now.getTime() - roomState.play_started_at.getTime()) / 1000;
        currentPosition = Math.max(0, roomState.current_position + elapsedSeconds);
      }

      const syncEvent: PlaybackSyncEvent = {
        type: roomState.is_playing ? 'play' : 'pause',
        song_id: roomState.current_song_id,
        position: currentPosition,
        timestamp: now.getTime(),
        user_id: 0 // System sync
      };

      socket.emit('playback_sync', syncEvent);
    } catch (error) {
      console.error('Error sending room sync:', error);
    }
  }

  private async getRoomData(roomId: number) {
    const room = await RoomModel.findById(roomId);
    const participants = await RoomModel.getParticipants(roomId);
    const queue = await RoomModel.getQueue(roomId);
    
    return {
      room,
      participants,
      queue
    };
  }

  // Periodic sync to keep rooms in sync
  startPeriodicSync(): void {
    setInterval(() => {
      this.roomStates.forEach(async (roomState, roomId) => {
        try {
          if (roomState.is_playing && roomState.play_started_at) {
            const now = new Date();
            const elapsedSeconds = (now.getTime() - roomState.play_started_at.getTime()) / 1000;
            const newPosition = roomState.current_position + elapsedSeconds;
            
            // Update database every 10 seconds during playback
            if (now.getTime() - roomState.last_update.getTime() > 10000) {
              await RoomModel.updatePlaybackState(roomId, {
                current_position: newPosition
              });
              roomState.current_position = newPosition;
              roomState.play_started_at = now;
              roomState.last_update = now;
            }
          }
        } catch (error) {
          console.error('Error in periodic sync:', error);
        }
      });
    }, 5000); // Every 5 seconds
  }
}