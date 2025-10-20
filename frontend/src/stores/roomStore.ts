import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { Song } from '../types';
import { usePlayerStore } from './playerStore';

export type RoomRole = 'host' | 'listener';

export interface RoomParticipant {
  id: number;
  user_id: number;
  username: string;
  role: RoomRole;
  joined_at: string;
  is_active: boolean;
}

export interface QueueItem {
  id: number;
  song_id: number;
  added_by: number;
  added_by_username: string;
  added_at: string;
  position: number;
  song: Song;
}

export interface Room {
  id: number;
  name: string;
  description?: string;
  code: string;
  host_id: number;
  host?: {
    id: number;
    username: string;
    email: string;
  };
  host_username?: string;
  is_public: boolean;
  max_listeners: number;
  current_song?: Song;
  current_song_id?: number;
  current_position: number;
  is_playing: boolean;
  play_started_at?: string;
  participant_count?: number;
  created_at: string;
  updated_at: string;
  // User participation info
  isParticipant?: boolean;
  userRole?: RoomRole;
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

interface RoomState {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  
  // Room state
  currentRoom: Room | null;
  participants: RoomParticipant[];
  queue: QueueItem[];
  chatMessages: ChatMessage[];
  
  // UI state
  isJoining: boolean;
  isCreating: boolean;
  error: string | null;
  
  // Public rooms
  publicRooms: Room[];
  isLoadingPublicRooms: boolean;
  publicRoomsPagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  
  // Actions
  setSocket: (socket: Socket | null) => void;
  setConnectionState: (connected: boolean, error?: string) => void;
  
  // Room management
  setCurrentRoom: (room: Room | null) => void;
  setParticipants: (participants: RoomParticipant[]) => void;
  setQueue: (queue: QueueItem[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  // UI state management
  setJoining: (joining: boolean) => void;
  setCreating: (creating: boolean) => void;
  setError: (error: string | null) => void;
  
  // Public rooms
  setPublicRooms: (rooms: Room[]) => void;
  setLoadingPublicRooms: (loading: boolean) => void;
  setPublicRoomsPagination: (page: number, limit: number, hasMore: boolean) => void;
  
  // Utilities
  isHost: () => boolean;
  isMasterHost: () => boolean;
  isInRoom: () => boolean;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  // Connection state
  socket: null,
  isConnected: false,
  connectionError: null,
  
  // Room state
  currentRoom: null,
  participants: [],
  queue: [],
  chatMessages: [],
  
  // UI state
  isJoining: false,
  isCreating: false,
  error: null,
  
  // Public rooms
  publicRooms: [],
  isLoadingPublicRooms: false,
  publicRoomsPagination: {
    page: 1,
    limit: 20,
    hasMore: true
  },
  
  // Actions
  setSocket: (socket) => set({ socket }),
  setConnectionState: (connected, error) => set({ 
    isConnected: connected, 
    connectionError: error || null 
  }),
  
  // Room management
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setParticipants: (participants) => set({ participants }),
  setQueue: (queue) => set({ queue }),
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  clearChatMessages: () => set({ chatMessages: [] }),
  
  // UI state management
  setJoining: (joining) => set({ isJoining: joining }),
  setCreating: (creating) => set({ isCreating: creating }),
  setError: (error) => set({ error }),
  
  // Public rooms
  setPublicRooms: (rooms) => set({ publicRooms: rooms }),
  setLoadingPublicRooms: (loading) => set({ isLoadingPublicRooms: loading }),
  setPublicRoomsPagination: (page, limit, hasMore) => set({
    publicRoomsPagination: { page, limit, hasMore }
  }),
  
  // Utilities
  isHost: () => {
    const state = get();
    try {
      const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{"state":{"user":null}}');
      const userId = authStorage.state?.user?.id;
      
      // Check user's role in participants array first
      const userParticipant = state.participants.find(p => p.user_id === userId && p.is_active);
      if (userParticipant) {
        return userParticipant.role === 'host';
      }
      
      // Fallback to checking host_id (for backwards compatibility)
      return state.currentRoom?.host_id === userId;
    } catch {
      return false;
    }
  },

  isMasterHost: () => {
    const state = get();
    try {
      const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{"state":{"user":null}}');
      const userId = authStorage.state?.user?.id;
      
      // Master host is the user who created the room (matches host_id)
      return state.currentRoom?.host_id === userId;
    } catch {
      return false;
    }
  },
  
  isInRoom: () => {
    const state = get();
    return state.currentRoom !== null;
  },
  
  reset: () => {
    // Stop music playback when disconnecting from room
    const playerStore = usePlayerStore.getState();
    if (playerStore.isPlaying) {
      playerStore.stop();
    }
    
    set({
      currentRoom: null,
      participants: [],
      queue: [],
      chatMessages: [],
      isJoining: false,
      isCreating: false,
      error: null,
      publicRooms: [],
      isLoadingPublicRooms: false,
      publicRoomsPagination: {
        page: 1,
        limit: 20,
        hasMore: true
      }
    });
  }
}));