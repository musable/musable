import { Server, Socket } from 'socket.io';
export declare function initializeWebSocket(io: Server): void;
export declare function registerUserSocket(userId: number, socket: Socket): void;
export declare function unregisterUserSocket(userId: number, socket: Socket): void;
export declare function broadcastToUser(userId: number, message: any): void;
export declare function broadcastToDevice(userId: number, deviceId: string, message: any): void;
export declare function getUserSockets(userId: number): Set<Socket> | undefined;
export declare function isUserOnline(userId: number): boolean;
export declare function getUserConnectionCount(userId: number): number;
//# sourceMappingURL=websocket.d.ts.map