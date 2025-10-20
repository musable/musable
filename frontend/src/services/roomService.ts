import { io, Socket } from 'socket.io-client';
import { useRoomStore, PlaybackSyncEvent, ChatMessage, Room } from '../stores/roomStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { apiService } from './api';
import { getWebSocketUrl, loadConfig } from '../config/config';
import toast from 'react-hot-toast';

class RoomWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const token = useAuthStore.getState().token;
      
      if (!token) {
        reject(new Error('No authentication token'));
        return;
      }

      try {
        // Ensure config is loaded
        await loadConfig();
        
        // Disconnect existing socket
        if (this.socket) {
          this.socket.disconnect();
        }

        // Create new socket connection
        const baseWebSocketUrl = getWebSocketUrl();
        
        // Force socket.io to use the exact URL without port inference
        const socketioOptions = {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false
        };
        
        
        // Try to bypass socket.io's URL parsing by using the raw URL
        if (baseWebSocketUrl.includes('musable.breadjs.nl')) {
          // For production, try using just the domain without protocol to let socket.io handle it
          this.socket = io('https://musable.breadjs.nl', socketioOptions);
        } else {
          this.socket = io(baseWebSocketUrl, socketioOptions);
        }
      } catch (configError) {
        console.error('🎵 Failed to load config:', configError);
        reject(configError);
        return;
      }

      // Update store with socket instance
      useRoomStore.getState().setSocket(this.socket);

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('🎵 Connected to room service');
        useRoomStore.getState().setConnectionState(true);
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('🎵 Room service connection error:', error);
        useRoomStore.getState().setConnectionState(false, error.message);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        } else {
          reject(error);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('🎵 Disconnected from room service');
        useRoomStore.getState().setConnectionState(false);
      });

      // Room event handlers
      this.setupRoomEventHandlers();
    });
  }

  private setupRoomEventHandlers(): void {
    if (!this.socket) return;

    // Room management events
    this.socket.on('room_joined', (data: { room: Room; participants: any[]; queue: any[] }) => {
      console.log('🎵 Room joined data:', data);
      console.log('🎵 Participants received:', data.participants);
      const roomStore = useRoomStore.getState();
      roomStore.setCurrentRoom(data.room);
      roomStore.setParticipants(data.participants);
      roomStore.setQueue(data.queue);
      roomStore.setJoining(false);
      roomStore.clearChatMessages();
      toast.success(`Joined room: ${data.room.name}`);
    });

    this.socket.on('user_joined', (data: { user: { id: number; username: string } }) => {
      const roomStore = useRoomStore.getState();
      roomStore.addChatMessage({
        id: `system_${Date.now()}_join`,
        user_id: 0,
        username: 'System',
        message: `${data.user.username} joined the room`,
        timestamp: Date.now(),
        type: 'system'
      });
      toast(`${data.user.username} joined the room`, { icon: '👋' });
    });

    this.socket.on('user_left', (data: { user: { id: number; username: string } }) => {
      const roomStore = useRoomStore.getState();
      roomStore.addChatMessage({
        id: `system_${Date.now()}_leave`,
        user_id: 0,
        username: 'System',
        message: `${data.user.username} left the room`,
        timestamp: Date.now(),
        type: 'system'
      });
      toast(`${data.user.username} left the room`, { icon: '👋' });
    });

    // Playback synchronization
    this.socket.on('playback_sync', (event: PlaybackSyncEvent) => {
      this.handlePlaybackSync(event);
    });

    // Queue management
    this.socket.on('queue_updated', (data: { queue: any[] }) => {
      useRoomStore.getState().setQueue(data.queue);
    });

    // Participants updates
    this.socket.on('participants_updated', (data: { participants: any[] }) => {
      console.log('🎵 Participants updated:', data.participants);
      useRoomStore.getState().setParticipants(data.participants);
    });

    // Chat messages
    this.socket.on('room_chat', (message: ChatMessage) => {
      useRoomStore.getState().addChatMessage(message);
    });

    // Error handling
    this.socket.on('room_error', (error: { message: string }) => {
      console.error('🎵 Room error:', error);
      
      // Handle "Room not found" errors specifically
      if (error.message === 'Room not found') {
        // Clean up localStorage since the room doesn't exist anymore
        localStorage.removeItem('lastJoinedRoom');
        console.log('🧹 Cleaned up localStorage: removed lastJoinedRoom');
        
        // Reset room state silently without showing error toast
        useRoomStore.getState().reset();
        useRoomStore.getState().setError(null);
        return;
      }
      
      // For other errors, show them normally
      useRoomStore.getState().setError(error.message);
      toast.error(error.message);
    });
  }

  private handlePlaybackSync(event: PlaybackSyncEvent): void {
    const playerStore = usePlayerStore.getState();
    const roomStore = useRoomStore.getState();
    
    // Don't sync if we're the one who triggered the event, EXCEPT for play/pause events
    // which need to sync back to update the UI state
    try {
      const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{"state":{"user":null}}');
      const currentUser = authStorage.state?.user;
      const isSelfEvent = currentUser && event.user_id === currentUser.id && event.user_id !== 0;
      
      // Skip self-sync for seek only, but allow play/pause and song_change to sync back
      if (isSelfEvent && event.type === 'seek') {
        return;
      }
    } catch {
      // If auth parsing fails, continue with sync
    }

    console.log('🎵 Received playbook sync:', event);

    switch (event.type) {
      case 'play':
        // Handle song change if different song ID is provided
        if (event.song_id && event.song_id !== playerStore.currentSong?.id) {
          // Find song in queue and play it
          const queueSong = roomStore.queue.find(item => item.song_id === event.song_id);
          if (queueSong && queueSong.song) {
            playerStore.play(queueSong.song);
            if (event.position !== undefined) {
              playerStore.seek(event.position);
            }
          } else if (event.song_id) {
            // If song not found in queue, fetch it from API
            console.log('🎵 Song not found in queue, fetching song data for ID:', event.song_id);
            this.fetchAndPlaySong(event.song_id, event.position);
          }
        } else if (playerStore.currentSong) {
          // Resume current song if no song change is needed
          if (event.position !== undefined) {
            playerStore.seek(event.position);
          }
          if (!playerStore.isPlaying) {
            playerStore.play();
          }
        }
        break;

      case 'pause':
        if (playerStore.isPlaying) {
          playerStore.pause();
        }
        break;

      case 'seek':
        if (event.position !== undefined) {
          playerStore.seek(event.position);
        }
        break;

      case 'song_change':
        if (event.song_id) {
          const queueSong = roomStore.queue.find(item => item.song_id === event.song_id);
          if (queueSong) {
            playerStore.play(queueSong.song);
            playerStore.seek(0);
          }
        }
        break;
    }
  }

  private async fetchAndPlaySong(songId: number, position?: number): Promise<void> {
    try {
      console.log('🎵 Fetching song data for ID:', songId);
      const response = await apiService.getSong(songId);
      if (response.success && response.data?.song) {
        console.log('🎵 Successfully fetched song:', response.data.song.title);
        const playerStore = usePlayerStore.getState();
        playerStore.play(response.data.song);
        // Seek after playing if position was provided
        if (position !== undefined) {
          // Wait a bit for the audio to load before seeking
          setTimeout(() => playerStore.seek(position), 100);
        }
      } else {
        console.error('🚨 Failed to fetch song data:', response);
      }
    } catch (error) {
      console.error('🚨 Error fetching song for playback sync:', error);
    }
  }

  // Room management methods
  joinRoom(roomCode: string): void {
    if (!this.socket) {
      toast.error('Not connected to room service');
      return;
    }

    useRoomStore.getState().setJoining(true);
    useRoomStore.getState().setError(null);
    this.socket.emit('join_room', { roomCode: roomCode.toUpperCase() });
  }

  leaveRoom(): void {
    if (!this.socket) return;

    this.socket.emit('leave_room');
    useRoomStore.getState().reset();
    toast.success('Left the room');
  }

  // Playback control methods (host only)
  playRoom(songId?: number, position?: number): void {
    if (!this.socket || !useRoomStore.getState().isHost()) return;

    this.socket.emit('room_play', { song_id: songId, position });
  }

  pauseRoom(): void {
    if (!this.socket || !useRoomStore.getState().isHost()) return;

    this.socket.emit('room_pause');
  }

  seekRoom(position: number): void {
    if (!this.socket || !useRoomStore.getState().isHost()) return;

    this.socket.emit('room_seek', { position });
  }

  changeSong(songId: number): void {
    if (!this.socket || !useRoomStore.getState().isHost()) return;

    this.socket.emit('room_song_change', { song_id: songId });
  }

  // Queue management
  addToQueue(songId: number): void {
    if (!this.socket) return;

    this.socket.emit('add_to_queue', { song_id: songId });
  }

  addToQueueTop(songId: number): void {
    if (!this.socket) return;

    this.socket.emit('add_to_queue_top', { song_id: songId });
  }

  removeFromQueue(queueItemId: number): void {
    if (!this.socket) return;

    this.socket.emit('remove_from_queue', { queue_item_id: queueItemId });
  }

  // Chat
  sendMessage(message: string): void {
    if (!this.socket || !message.trim()) return;

    this.socket.emit('room_chat', { message: message.trim() });
  }

  // Request manual sync
  requestSync(): void {
    if (!this.socket) return;

    this.socket.emit('request_sync');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    useRoomStore.getState().setSocket(null);
    useRoomStore.getState().setConnectionState(false);
    useRoomStore.getState().reset();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
export const roomWebSocketService = new RoomWebSocketService();
export default roomWebSocketService;