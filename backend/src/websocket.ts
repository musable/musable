import { Server, Socket } from 'socket.io';

// Store user-to-socket mappings
const userSockets = new Map<number, Set<Socket>>();

/**
 * Initialize WebSocket utilities
 */
export function initializeWebSocket(io: Server): void {
  // This function can be used for global WebSocket initialization if needed
}

/**
 * Register a socket for a user
 */
export function registerUserSocket(userId: number, socket: Socket): void {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket);
}

/**
 * Unregister a socket for a user
 */
export function unregisterUserSocket(userId: number, socket: Socket): void {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socket);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }
}

/**
 * Broadcast message to all sockets of a specific user
 */
export function broadcastToUser(userId: number, message: any): void {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach(socket => {
      socket.emit('message', message);
    });
  }
}

/**
 * Broadcast message to specific device of a user
 */
export function broadcastToDevice(userId: number, deviceId: string, message: any): void {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach(socket => {
      // Check if socket has the deviceId property
      if ((socket as any).deviceId === deviceId) {
        socket.emit('message', message);
      }
    });
  }
}

/**
 * Get all active sockets for a user
 */
export function getUserSockets(userId: number): Set<Socket> | undefined {
  return userSockets.get(userId);
}

/**
 * Check if user has any active connections
 */
export function isUserOnline(userId: number): boolean {
  const sockets = userSockets.get(userId);
  return sockets !== undefined && sockets.size > 0;
}

/**
 * Get count of active connections for a user
 */
export function getUserConnectionCount(userId: number): number {
  const sockets = userSockets.get(userId);
  return sockets ? sockets.size : 0;
}
