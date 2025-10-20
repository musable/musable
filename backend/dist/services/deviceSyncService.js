"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceSyncService = void 0;
const deviceService_1 = require("./deviceService");
const playbackSyncService_1 = require("./playbackSyncService");
const websocket_1 = require("../websocket");
const logger_1 = __importDefault(require("../utils/logger"));
class DeviceSyncService {
    constructor(io) {
        this.io = io;
        this.initializeHandlers();
    }
    initializeHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.default.info(`[DeviceSync] Socket connected: ${socket.id}`);
            socket.on('device:register', (data) => this.handleDeviceRegister(socket, data));
            socket.on('device:heartbeat', (data) => this.handleDeviceHeartbeat(socket, data));
            socket.on('playback:update', (data) => this.handlePlaybackUpdate(socket, data));
            socket.on('playback:handoff', (data) => this.handlePlaybackHandoff(socket, data));
            socket.on('playback:remote_command', (data) => this.handleRemoteCommand(socket, data));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }
    async handleDeviceRegister(socket, data) {
        try {
            const { userId, deviceInfo } = data;
            if (!userId || !deviceInfo) {
                socket.emit('error', { message: 'Missing required fields: userId, deviceInfo' });
                return;
            }
            if (!deviceInfo.deviceId || !deviceInfo.deviceName || !deviceInfo.deviceType) {
                socket.emit('error', { message: 'Invalid device info' });
                return;
            }
            const device = await deviceService_1.DeviceService.registerDevice(userId, deviceInfo);
            socket.deviceId = deviceInfo.deviceId;
            socket.userId = userId;
            (0, websocket_1.registerUserSocket)(userId, socket);
            socket.emit('device:registered', {
                device,
                message: 'Device registered successfully',
            });
            const devices = await deviceService_1.DeviceService.getUserDevices(userId);
            this.broadcastToUser(userId, {
                type: 'devices_updated',
                payload: { devices },
            });
            const session = await playbackSyncService_1.PlaybackSyncService.getSession(userId);
            socket.emit('message', {
                type: 'playback_sync',
                payload: {
                    activeDeviceId: session.activeDeviceId,
                    currentSongId: session.currentSongId,
                    currentPosition: session.currentPosition,
                    isPlaying: session.isPlaying,
                    volume: session.volume,
                    queue: session.queue,
                    currentIndex: session.currentIndex,
                    shuffle: session.shuffle,
                    repeatMode: session.repeatMode,
                    updatedAt: session.updatedAt,
                },
            });
            logger_1.default.info(`[DeviceSync] Device registered: ${deviceInfo.deviceName} (${deviceInfo.deviceId}) for user ${userId}`);
        }
        catch (error) {
            logger_1.default.error(`[DeviceSync] Error registering device:`, error);
            socket.emit('error', { message: error.message || 'Failed to register device' });
        }
    }
    async handleDeviceHeartbeat(socket, data) {
        try {
            const { deviceId } = data;
            const userId = socket.userId;
            if (!deviceId || !userId) {
                return;
            }
            await deviceService_1.DeviceService.updateDeviceActivity(deviceId);
        }
        catch (error) {
            logger_1.default.error(`[DeviceSync] Error handling heartbeat:`, error);
        }
    }
    async handlePlaybackUpdate(socket, data) {
        try {
            const { state } = data;
            const userId = socket.userId;
            const deviceId = socket.deviceId;
            if (!userId || !deviceId) {
                socket.emit('error', { message: 'Device not registered' });
                return;
            }
            await playbackSyncService_1.PlaybackSyncService.updatePlaybackState(userId, deviceId, state);
            const session = await playbackSyncService_1.PlaybackSyncService.getSession(userId);
            this.broadcastToUser(userId, {
                type: 'playback_sync',
                payload: {
                    activeDeviceId: session.activeDeviceId,
                    currentSongId: session.currentSongId,
                    currentPosition: session.currentPosition,
                    isPlaying: session.isPlaying,
                    volume: session.volume,
                    queue: session.queue,
                    currentIndex: session.currentIndex,
                    shuffle: session.shuffle,
                    repeatMode: session.repeatMode,
                    updatedAt: session.updatedAt,
                },
            });
            logger_1.default.info(`[DeviceSync] Playback updated for user ${userId} from device ${deviceId} and broadcast to all devices`);
        }
        catch (error) {
            logger_1.default.error(`[DeviceSync] Error updating playback:`, error);
            socket.emit('error', { message: error.message || 'Failed to update playback' });
        }
    }
    async handlePlaybackHandoff(socket, data) {
        try {
            const { toDeviceId } = data;
            const userId = socket.userId;
            const fromDeviceId = socket.deviceId;
            if (!userId || !fromDeviceId) {
                socket.emit('error', { message: 'Device not registered' });
                return;
            }
            if (!toDeviceId) {
                socket.emit('error', { message: 'Missing target device ID' });
                return;
            }
            const session = await playbackSyncService_1.PlaybackSyncService.handoffPlayback(userId, fromDeviceId, toDeviceId);
            socket.emit('playback:handoff_success', {
                message: 'Playback transferred successfully',
                session,
            });
            logger_1.default.info(`[DeviceSync] Playback handoff from ${fromDeviceId} to ${toDeviceId} for user ${userId}`);
        }
        catch (error) {
            logger_1.default.error(`[DeviceSync] Error handling playback handoff:`, error);
            socket.emit('error', { message: error.message || 'Failed to transfer playback' });
        }
    }
    async handleRemoteCommand(socket, data) {
        try {
            const { command, value } = data;
            const userId = socket.userId;
            if (!userId) {
                socket.emit('error', { message: 'Device not registered' });
                return;
            }
            if (!command) {
                socket.emit('error', { message: 'Missing command' });
                return;
            }
            await playbackSyncService_1.PlaybackSyncService.sendRemoteCommand(userId, command, value);
            logger_1.default.info(`[DeviceSync] Remote command '${command}' sent for user ${userId}`);
        }
        catch (error) {
            logger_1.default.error(`[DeviceSync] Error sending remote command:`, error);
            socket.emit('error', { message: error.message || 'Failed to send command' });
        }
    }
    async handleDisconnect(socket) {
        const userId = socket.userId;
        const deviceId = socket.deviceId;
        if (userId) {
            (0, websocket_1.unregisterUserSocket)(userId, socket);
            if (deviceId) {
                try {
                    await playbackSyncService_1.PlaybackSyncService.clearActiveDevice(userId, deviceId);
                }
                catch (error) {
                    logger_1.default.error(`[DeviceSync] Error clearing active device:`, error);
                }
            }
            logger_1.default.info(`[DeviceSync] Device disconnected: ${deviceId} for user ${userId}`);
        }
        logger_1.default.info(`[DeviceSync] Socket disconnected: ${socket.id}`);
    }
    broadcastToUser(userId, message) {
        this.io.sockets.sockets.forEach((socket) => {
            if (socket.userId === userId) {
                socket.emit('message', message);
            }
        });
    }
}
exports.DeviceSyncService = DeviceSyncService;
//# sourceMappingURL=deviceSyncService.js.map