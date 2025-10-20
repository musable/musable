"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Room_1 = require("../models/Room");
const User_1 = require("../models/User");
class RoomService {
    constructor(io) {
        this.roomStates = new Map();
        this.io = io;
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.use(this.authenticateSocket.bind(this));
        this.io.on('connection', (socket) => {
            console.log(`🎵 User ${socket.user?.username} connected to room service`);
            socket.on('join_room', async (data) => {
                await this.handleJoinRoom(socket, data.roomCode);
            });
            socket.on('leave_room', async () => {
                await this.handleLeaveRoom(socket);
            });
            socket.on('room_play', async (data) => {
                await this.handlePlaybackControl(socket, 'play', data);
            });
            socket.on('room_pause', async () => {
                await this.handlePlaybackControl(socket, 'pause', {});
            });
            socket.on('room_seek', async (data) => {
                await this.handlePlaybackControl(socket, 'seek', data);
            });
            socket.on('room_song_change', async (data) => {
                await this.handlePlaybackControl(socket, 'song_change', data);
            });
            socket.on('add_to_queue', async (data) => {
                await this.handleAddToQueue(socket, data.song_id);
            });
            socket.on('add_to_queue_top', async (data) => {
                await this.handleAddToQueueTop(socket, data.song_id);
            });
            socket.on('remove_from_queue', async (data) => {
                await this.handleRemoveFromQueue(socket, data.queue_item_id);
            });
            socket.on('room_chat', async (data) => {
                await this.handleChatMessage(socket, data.message);
            });
            socket.on('request_sync', async () => {
                await this.sendRoomSync(socket);
            });
            socket.on('disconnect', async () => {
                console.log(`🎵 User ${socket.user?.username} disconnected from room service`);
                await this.handleLeaveRoom(socket);
            });
        });
    }
    async authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
            console.log('🔍 WebSocket auth debug - Token received:', token ? 'YES' : 'NO');
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            console.log('🔍 WebSocket auth debug - Decoded JWT:', { id: decoded.id, userId: decoded.userId, exp: decoded.exp });
            const userModel = new User_1.UserModel();
            const user = await userModel.findById(decoded.id);
            console.log('🔍 WebSocket auth debug - User found:', user ? `YES (${user.username})` : 'NO');
            if (!user) {
                return next(new Error('User not found'));
            }
            socket.user = user;
            next();
        }
        catch (error) {
            console.error('🔍 WebSocket auth debug - Authentication error:', error instanceof Error ? error.message : String(error));
            next(new Error('Authentication failed'));
        }
    }
    async handleJoinRoom(socket, roomCode) {
        try {
            if (!socket.user)
                return;
            const room = await Room_1.RoomModel.findByCode(roomCode);
            if (!room) {
                socket.emit('room_error', { message: 'Room not found' });
                return;
            }
            const participants = await Room_1.RoomModel.getParticipants(room.id);
            if (participants.length >= room.max_listeners && !participants.some(p => p.user_id === socket.user.id)) {
                socket.emit('room_error', { message: 'Room is full' });
                return;
            }
            if (socket.currentRoom) {
                await this.handleLeaveRoom(socket);
            }
            await Room_1.RoomModel.addParticipant(room.id, socket.user.id);
            socket.join(`room_${room.id}`);
            socket.currentRoom = `room_${room.id}`;
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
            const roomData = await this.getRoomData(room.id);
            socket.emit('room_joined', roomData);
            await this.sendRoomSync(socket);
            const updatedParticipants = await Room_1.RoomModel.getParticipants(room.id);
            this.io.to(`room_${room.id}`).emit('participants_updated', {
                participants: updatedParticipants
            });
            socket.to(`room_${room.id}`).emit('user_joined', {
                user: {
                    id: socket.user.id,
                    username: socket.user.username
                }
            });
            console.log(`🎵 User ${socket.user.username} joined room ${room.name} (${room.code})`);
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('room_error', { message: 'Failed to join room' });
        }
    }
    async handleLeaveRoom(socket) {
        try {
            if (!socket.user || !socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            await Room_1.RoomModel.removeParticipant(roomId, socket.user.id);
            const remainingParticipants = await Room_1.RoomModel.getParticipants(roomId);
            console.log(`🎵 After ${socket.user.username} left room ${roomId}, remaining participants: ${remainingParticipants.length}`);
            if (remainingParticipants.length === 0) {
                try {
                    await Room_1.RoomModel.delete(roomId);
                    this.roomStates.delete(roomId);
                    console.log(`🎵 Room ${roomId} auto-deleted - last participant left`);
                }
                catch (deleteError) {
                    console.error(`🎵 Failed to auto-delete room ${roomId}:`, deleteError);
                }
            }
            else {
                this.io.to(`room_${roomId}`).emit('participants_updated', {
                    participants: remainingParticipants
                });
                socket.to(socket.currentRoom).emit('user_left', {
                    user: {
                        id: socket.user.id,
                        username: socket.user.username
                    }
                });
                console.log(`🎵 Notified ${remainingParticipants.length} participants about ${socket.user.username} leaving room ${roomId}`);
            }
            socket.leave(socket.currentRoom);
            socket.currentRoom = undefined;
            console.log(`🎵 User ${socket.user.username} left room ${roomId}`);
        }
        catch (error) {
            console.error('Error leaving room:', error);
        }
    }
    async handlePlaybackControl(socket, type, data) {
        try {
            if (!socket.user || !socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            const room = await Room_1.RoomModel.findById(roomId);
            if (!room)
                return;
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
            if (roomState.is_playing && roomState.play_started_at) {
                const elapsedSeconds = (now.getTime() - roomState.play_started_at.getTime()) / 1000;
                roomState.current_position = Math.max(0, roomState.current_position + elapsedSeconds);
            }
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
            await Room_1.RoomModel.updatePlaybackState(roomId, {
                current_song_id: roomState.current_song_id,
                current_position: roomState.current_position,
                is_playing: roomState.is_playing,
                play_started_at: roomState.play_started_at?.toISOString()
            });
            const syncEvent = {
                type,
                song_id: roomState.current_song_id,
                position: roomState.current_position,
                timestamp,
                user_id: socket.user.id
            };
            this.io.to(`room_${roomId}`).emit('playback_sync', syncEvent);
            console.log(`🎵 Room ${roomId} playback control: ${type} by ${socket.user.username}`);
        }
        catch (error) {
            console.error('Error handling playback control:', error);
            socket.emit('room_error', { message: 'Failed to control playback' });
        }
    }
    async handleAddToQueue(socket, songId) {
        try {
            if (!socket.user || !socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            await Room_1.RoomModel.addToQueue(roomId, songId, socket.user.id);
            const queue = await Room_1.RoomModel.getQueue(roomId);
            this.io.to(`room_${roomId}`).emit('queue_updated', { queue });
            console.log(`🎵 Song ${songId} added to room ${roomId} queue by ${socket.user.username}`);
        }
        catch (error) {
            console.error('Error adding to queue:', error);
            socket.emit('room_error', { message: 'Failed to add song to queue' });
        }
    }
    async handleAddToQueueTop(socket, songId) {
        try {
            if (!socket.user || !socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            await Room_1.RoomModel.addToQueueTop(roomId, songId, socket.user.id);
            const queue = await Room_1.RoomModel.getQueue(roomId);
            this.io.to(`room_${roomId}`).emit('queue_updated', { queue });
            await this.handlePlaybackControl(socket, 'song_change', { song_id: songId });
            console.log(`🎵 Song ${songId} added to TOP of room ${roomId} queue and playing by ${socket.user.username}`);
        }
        catch (error) {
            console.error('Error adding to queue top:', error);
            socket.emit('room_error', { message: 'Failed to add song to queue' });
        }
    }
    async handleRemoveFromQueue(socket, queueItemId) {
        try {
            if (!socket.user || !socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            const queueItem = await Room_1.RoomModel.getQueueItem(roomId, queueItemId);
            if (!queueItem) {
                socket.emit('room_error', { message: 'Queue item not found' });
                return;
            }
            const room = await Room_1.RoomModel.findById(roomId);
            if (!room) {
                socket.emit('room_error', { message: 'Room not found' });
                return;
            }
            const isHost = room.host_id === socket.user.id;
            const isOwner = queueItem.added_by === socket.user.id;
            if (!isHost && !isOwner) {
                socket.emit('room_error', { message: 'You can only remove songs you added to the queue' });
                return;
            }
            await Room_1.RoomModel.removeFromQueue(roomId, queueItemId);
            const queue = await Room_1.RoomModel.getQueue(roomId);
            this.io.to(`room_${roomId}`).emit('queue_updated', { queue });
            console.log(`🎵 Queue item ${queueItemId} removed from room ${roomId} by ${socket.user.username} (${isHost ? 'host' : 'owner'})`);
        }
        catch (error) {
            console.error('Error removing from queue:', error);
            socket.emit('room_error', { message: 'Failed to remove song from queue' });
        }
    }
    async handleChatMessage(socket, message) {
        try {
            if (!socket.user || !socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            const chatMessage = {
                id: `${Date.now()}_${socket.user.id}`,
                user_id: socket.user.id,
                username: socket.user.username,
                message: message.trim(),
                timestamp: Date.now(),
                type: 'chat'
            };
            this.io.to(`room_${roomId}`).emit('room_chat', chatMessage);
        }
        catch (error) {
            console.error('Error handling chat message:', error);
        }
    }
    async sendRoomSync(socket) {
        try {
            if (!socket.currentRoom)
                return;
            const roomId = parseInt(socket.currentRoom.replace('room_', ''));
            const roomState = this.roomStates.get(roomId);
            if (!roomState)
                return;
            const now = new Date();
            let currentPosition = roomState.current_position;
            if (roomState.is_playing && roomState.play_started_at) {
                const elapsedSeconds = (now.getTime() - roomState.play_started_at.getTime()) / 1000;
                currentPosition = Math.max(0, roomState.current_position + elapsedSeconds);
            }
            const syncEvent = {
                type: roomState.is_playing ? 'play' : 'pause',
                song_id: roomState.current_song_id,
                position: currentPosition,
                timestamp: now.getTime(),
                user_id: 0
            };
            socket.emit('playback_sync', syncEvent);
        }
        catch (error) {
            console.error('Error sending room sync:', error);
        }
    }
    async getRoomData(roomId) {
        const room = await Room_1.RoomModel.findById(roomId);
        const participants = await Room_1.RoomModel.getParticipants(roomId);
        const queue = await Room_1.RoomModel.getQueue(roomId);
        return {
            room,
            participants,
            queue
        };
    }
    startPeriodicSync() {
        setInterval(() => {
            this.roomStates.forEach(async (roomState, roomId) => {
                try {
                    if (roomState.is_playing && roomState.play_started_at) {
                        const now = new Date();
                        const elapsedSeconds = (now.getTime() - roomState.play_started_at.getTime()) / 1000;
                        const newPosition = roomState.current_position + elapsedSeconds;
                        if (now.getTime() - roomState.last_update.getTime() > 10000) {
                            await Room_1.RoomModel.updatePlaybackState(roomId, {
                                current_position: newPosition
                            });
                            roomState.current_position = newPosition;
                            roomState.play_started_at = now;
                            roomState.last_update = now;
                        }
                    }
                }
                catch (error) {
                    console.error('Error in periodic sync:', error);
                }
            });
        }, 5000);
    }
}
exports.RoomService = RoomService;
//# sourceMappingURL=roomService.js.map