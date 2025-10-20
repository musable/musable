"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybackSyncService = void 0;
const PlaybackSession_1 = require("../models/PlaybackSession");
const Device_1 = require("../models/Device");
const websocket_1 = require("../websocket");
class PlaybackSyncService {
    static async getSession(userId) {
        return await PlaybackSession_1.PlaybackSessionModel.getOrCreate(userId);
    }
    static async updatePlaybackState(userId, deviceId, state) {
        const session = await this.getSession(userId);
        if (state.isPlaying && session.activeDeviceId !== deviceId) {
            await this.setActiveDevice(userId, deviceId);
        }
        const updatedSession = await PlaybackSession_1.PlaybackSessionModel.updateState(userId, state);
        await this.broadcastState(userId);
        return updatedSession;
    }
    static async setActiveDevice(userId, deviceId) {
        const device = await Device_1.DeviceModel.getByDeviceId(deviceId);
        if (!device || device.userId !== userId) {
            throw new Error('Device not found or access denied');
        }
        const session = await this.getSession(userId);
        const previousActiveDevice = session.activeDeviceId;
        const updatedSession = await PlaybackSession_1.PlaybackSessionModel.setActiveDevice(userId, deviceId);
        if (previousActiveDevice && previousActiveDevice !== deviceId) {
            (0, websocket_1.broadcastToUser)(userId, {
                type: 'lost_active_player',
                deviceId: previousActiveDevice,
                payload: {},
            });
        }
        (0, websocket_1.broadcastToUser)(userId, {
            type: 'became_active_player',
            deviceId,
            payload: {
                state: this.getPlaybackStateFromSession(updatedSession),
            },
        });
        await this.broadcastState(userId);
        return updatedSession;
    }
    static async handoffPlayback(userId, fromDeviceId, toDeviceId) {
        const session = await this.getSession(userId);
        if (session.activeDeviceId !== fromDeviceId) {
            throw new Error('Source device is not the active player');
        }
        const targetDevice = await Device_1.DeviceModel.getByDeviceId(toDeviceId);
        if (!targetDevice || targetDevice.userId !== userId) {
            throw new Error('Target device not found or access denied');
        }
        const updatedSession = await this.setActiveDevice(userId, toDeviceId);
        (0, websocket_1.broadcastToUser)(userId, {
            type: 'playback_handoff',
            deviceId: toDeviceId,
            payload: {
                targetDeviceId: toDeviceId,
                state: this.getPlaybackStateFromSession(updatedSession),
            },
        });
        return updatedSession;
    }
    static async sendRemoteCommand(userId, command, value) {
        const session = await this.getSession(userId);
        if (!session.activeDeviceId) {
            throw new Error('No active device to control');
        }
        (0, websocket_1.broadcastToUser)(userId, {
            type: 'remote_command',
            deviceId: session.activeDeviceId,
            payload: {
                command,
                value,
            },
        });
        if (command === 'play') {
            await PlaybackSession_1.PlaybackSessionModel.updateState(userId, { isPlaying: true });
        }
        else if (command === 'pause') {
            await PlaybackSession_1.PlaybackSessionModel.updateState(userId, { isPlaying: false });
        }
        else if (command === 'seek' && value !== undefined) {
            await PlaybackSession_1.PlaybackSessionModel.updateState(userId, { currentPosition: value });
        }
        await this.broadcastState(userId);
    }
    static async broadcastState(userId) {
        const session = await this.getSession(userId);
        (0, websocket_1.broadcastToUser)(userId, {
            type: 'playback_sync',
            payload: {
                activeDeviceId: session.activeDeviceId,
                ...this.getPlaybackStateFromSession(session),
                updatedAt: session.updatedAt,
            },
        });
    }
    static async clearActiveDevice(userId, deviceId) {
        await PlaybackSession_1.PlaybackSessionModel.clearActiveDevice(userId, deviceId);
        await this.broadcastState(userId);
    }
    static getPlaybackStateFromSession(session) {
        return {
            currentSongId: session.currentSongId,
            currentPosition: session.currentPosition,
            isPlaying: session.isPlaying,
            volume: session.volume,
            queue: session.queue,
            currentIndex: session.currentIndex,
            shuffle: session.shuffle,
            repeatMode: session.repeatMode,
        };
    }
}
exports.PlaybackSyncService = PlaybackSyncService;
//# sourceMappingURL=playbackSyncService.js.map