"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = initializeWebSocket;
exports.registerUserSocket = registerUserSocket;
exports.unregisterUserSocket = unregisterUserSocket;
exports.broadcastToUser = broadcastToUser;
exports.broadcastToDevice = broadcastToDevice;
exports.getUserSockets = getUserSockets;
exports.isUserOnline = isUserOnline;
exports.getUserConnectionCount = getUserConnectionCount;
const userSockets = new Map();
function initializeWebSocket(io) {
}
function registerUserSocket(userId, socket) {
    if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket);
}
function unregisterUserSocket(userId, socket) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
            userSockets.delete(userId);
        }
    }
}
function broadcastToUser(userId, message) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        sockets.forEach(socket => {
            socket.emit('message', message);
        });
    }
}
function broadcastToDevice(userId, deviceId, message) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        sockets.forEach(socket => {
            if (socket.deviceId === deviceId) {
                socket.emit('message', message);
            }
        });
    }
}
function getUserSockets(userId) {
    return userSockets.get(userId);
}
function isUserOnline(userId) {
    const sockets = userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
}
function getUserConnectionCount(userId) {
    const sockets = userSockets.get(userId);
    return sockets ? sockets.size : 0;
}
//# sourceMappingURL=websocket.js.map