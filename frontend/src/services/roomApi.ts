import { apiService } from '../services/api';
import { Room } from '../stores/roomStore';

export interface CreateRoomData {
  name: string;
  description?: string;
  is_public?: boolean;
  max_listeners?: number;
}

export interface JoinRoomData {
  code: string;
}

export interface PublicRoomsResponse {
  rooms: Room[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface RoomDetailsResponse {
  room: Room;
  participants: any[];
  queue: any[];
}

class RoomApiService {
  // Get public rooms with pagination
  async getPublicRooms(page: number = 1, limit: number = 20): Promise<PublicRoomsResponse> {
    const response = await apiService.request<PublicRoomsResponse>('GET', `/rooms/public?page=${page}&limit=${limit}`);
    return response as unknown as PublicRoomsResponse;
  }

  // Get user's rooms
  async getMyRooms(): Promise<{ rooms: Room[] }> {
    const response = await apiService.request<{ rooms: Room[] }>('GET', '/rooms/my-rooms');
    return response as unknown as { rooms: Room[] };
  }

  // Get room details by ID
  async getRoomById(roomId: number): Promise<RoomDetailsResponse> {
    const response = await apiService.request<RoomDetailsResponse>('GET', `/rooms/${roomId}`);
    return response as unknown as RoomDetailsResponse;
  }

  // Find room by code
  async findRoomByCode(code: string): Promise<Room> {
    const response = await apiService.request<Room>('GET', `/rooms/code/${code.toUpperCase()}`);
    return response as unknown as Room;
  }

  // Create a new room
  async createRoom(roomData: CreateRoomData): Promise<{ room: Room }> {
    const response = await apiService.request<{ room: Room }>('POST', '/rooms', roomData);
    return response as unknown as { room: Room };
  }

  // Join a room via REST API (WebSocket join happens separately)
  async joinRoom(joinData: JoinRoomData): Promise<RoomDetailsResponse> {
    const response = await apiService.request<RoomDetailsResponse>('POST', '/rooms/join', joinData);
    return response as unknown as RoomDetailsResponse;
  }

  // Leave a room
  async leaveRoom(roomId: number): Promise<{ message: string }> {
    const response = await apiService.request<{ message: string }>('POST', `/rooms/${roomId}/leave`);
    return response as unknown as { message: string };
  }

  // Add song to room queue
  async addToQueue(roomId: number, songId: number): Promise<{ queue: any[] }> {
    const response = await apiService.request<{ queue: any[] }>('POST', `/rooms/${roomId}/queue`, { song_id: songId });
    return response as unknown as { queue: any[] };
  }

  // Remove song from room queue
  async removeFromQueue(roomId: number, queueId: number): Promise<{ queue: any[] }> {
    const response = await apiService.request<{ queue: any[] }>('DELETE', `/rooms/${roomId}/queue/${queueId}`);
    return response as unknown as { queue: any[] };
  }

  // Update room settings (host only)
  async updateRoom(roomId: number, updateData: Partial<CreateRoomData>): Promise<{ room: Room }> {
    const response = await apiService.request<{ room: Room }>('PATCH', `/rooms/${roomId}`, updateData);
    return response as unknown as { room: Room };
  }

  // Change user role in room (host only)
  async changeUserRole(roomId: number, userId: number, role: 'host' | 'listener'): Promise<{ success: boolean; message: string; participants: any[] }> {
    const response = await apiService.request<{ success: boolean; message: string; participants: any[] }>('PATCH', `/rooms/${roomId}/participants/${userId}/role`, { role });
    return response as unknown as { success: boolean; message: string; participants: any[] };
  }

  // Delete room (host only)
  async deleteRoom(roomId: number): Promise<{ message: string }> {
    const response = await apiService.request<{ message: string }>('DELETE', `/rooms/${roomId}`);
    return response as unknown as { message: string };
  }
}

export const roomApiService = new RoomApiService();
export default roomApiService;