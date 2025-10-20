import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  UserGroupIcon, 
  PlusIcon,
  PlayIcon,
  PauseIcon,
  MusicalNoteIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useRoomStore } from '../stores/roomStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import roomWebSocketService from '../services/roomService';
import roomApiService from '../services/roomApi'; // Updated import

interface MusicRoomsPaneProps {
  isOpen: boolean;
  onClose: () => void;
}

const MusicRoomsPane: React.FC<MusicRoomsPaneProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { currentSong, isPlaying } = usePlayerStore();
  const roomStore = useRoomStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-fill room name options
  const roomNameTemplates = [
    "Vibes",
    "Sound Station", 
    "Music Lounge",
    "Beat Box",
    "Audio Den",
    "Rhythm Room",
    "Jam Session"
  ];

  const generateRandomRoomName = () => {
    if (!user?.username) return '';
    const randomTemplate = roomNameTemplates[Math.floor(Math.random() * roomNameTemplates.length)];
    return `${user.username}'s ${randomTemplate}`;
  };

  // Auto-reconnect to room on page refresh
  useEffect(() => {
    const attemptAutoReconnect = async () => {
      try {
        // Check if there's a saved room in localStorage
        const savedRoomCode = localStorage.getItem('lastJoinedRoom');
        if (savedRoomCode && !roomStore.currentRoom) {
          await roomWebSocketService.connect();
          roomWebSocketService.joinRoom(savedRoomCode);
        }
      } catch (error) {
        console.error('Failed to auto-reconnect:', error);
        // Remove the saved room if reconnection fails
        localStorage.removeItem('lastJoinedRoom');
      }
    };

    // Only attempt auto-reconnect when the component first mounts
    attemptAutoReconnect();
  }, []); // Empty dependency array - only run on mount

  // Load rooms when pane opens and set up auto-refresh
  useEffect(() => {
    if (isOpen) {
      loadRooms(true); // Show loading for initial load
      
      // Set up auto-refresh every 5 seconds
      const refreshInterval = setInterval(() => {
        loadRooms(false); // Don't show loading for background refresh
      }, 5000);
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [isOpen]);

  const loadRooms = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await roomApiService.getPublicRooms();
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleCreateRoom = async () => {
    if (!createRoomName.trim()) return;

    try {
      const roomData = {
        name: createRoomName.trim(),
        description: 'Quick room created from player',
        is_public: true,
        max_listeners: 10
      };
      
      const response = await roomApiService.createRoom(roomData);
      
      // Immediately join the room and sync current music
      await joinRoom(response.room.code, true);
      
      setCreateRoomName('');
      setShowCreateForm(false);
      onClose(); // Close the pane as we're now in the room
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const joinRoom = async (roomCode: string, syncMusic = false) => {
    try {
      // Connect to WebSocket and join room
      await roomWebSocketService.connect();
      roomWebSocketService.joinRoom(roomCode);
      
      // Save room code for auto-reconnect
      localStorage.setItem('lastJoinedRoom', roomCode);
      
      // If we have music playing and this is a new room, sync it
      if (syncMusic && currentSong && isPlaying) {
        // Small delay to ensure we're connected
        setTimeout(() => {
          // First add the song to the room queue, then play it
          roomWebSocketService.addToQueue(currentSong.id);
          // Wait a bit more for the queue to update
          setTimeout(() => {
            roomWebSocketService.playRoom(currentSong.id, 0);
          }, 500);
        }, 1000);
      }
      
      onClose(); // Close the pane
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const leaveCurrentRoom = () => {
    // Clear saved room for auto-reconnect
    localStorage.removeItem('lastJoinedRoom');
    roomWebSocketService.leaveRoom();
  };

  const deleteRoom = async (roomId: number) => {
    if (!user?.is_admin) return;
    
    if (!window.confirm('Are you sure you want to delete this room? This will disconnect all users.')) {
      return;
    }

    try {
      await roomApiService.deleteRoom(roomId);
      // Refresh the rooms list
      await loadRooms();
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  const changeUserRole = async (participantId: number, currentRole: string, participantUsername: string) => {
    if (!roomStore.currentRoom || !user?.id) return;

    // Check if current user is a host
    const currentUserParticipant = roomStore.participants.find(p => p.user_id === user.id);
    if (!currentUserParticipant || currentUserParticipant.role !== 'host') {
      alert('Only hosts can change user roles');
      return;
    }

    // Don't allow changing the original room creator's role
    if (roomStore.currentRoom.host_id === participantId && currentRole === 'host') {
      alert('Cannot change the original room creator\'s role');
      return;
    }

    const newRole = currentRole === 'host' ? 'listener' : 'host';
    const action = newRole === 'host' ? 'promote' : 'demote';
    
    if (!window.confirm(`Are you sure you want to ${action} ${participantUsername} ${newRole === 'host' ? 'to HOST' : 'to LISTENER'}?`)) {
      return;
    }

    try {
      const response = await roomApiService.changeUserRole(roomStore.currentRoom.id, participantId, newRole);
      
      // Update the local participants list
      roomStore.setParticipants(response.participants);
      
      console.log(`Successfully changed ${participantUsername}'s role to ${newRole}`);
    } catch (error) {
      console.error('Failed to change user role:', error);
      alert('Failed to change user role. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl w-full max-w-md max-h-[26rem] flex flex-col shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700/70 bg-gray-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/20 rounded-lg">
              <UserGroupIcon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-bold text-white text-base">Music Rooms</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all duration-200"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Current Room Status */}
        {roomStore.currentRoom && (
          <div className="p-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-white">{roomStore.currentRoom.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-300 flex items-center gap-1">
                    <UserGroupIcon className="w-3 h-3" />
                    {roomStore.participants.length}/{roomStore.currentRoom.max_listeners} listeners
                  </p>
                  {currentSong && (
                    <div className="flex items-center gap-1">
                      <MusicalNoteIcon className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary font-medium">
                        {currentSong.title}
                        {currentSong.artist_name && (
                          <span className="text-gray-300 opacity-80"> • {currentSong.artist_name}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {roomStore.participants.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Currently listening:</p>
                    <div className="flex flex-wrap gap-1">
                      {roomStore.participants.map((participant) => {
                        const currentUserParticipant = roomStore.participants.find(p => p.user_id === user?.id);
                        const canChangeRole = currentUserParticipant?.role === 'host' && 
                                             participant.user_id !== user?.id && 
                                             !(roomStore.currentRoom?.host_id === participant.user_id && participant.role === 'host');
                        
                        return (
                          <button
                            key={participant.id}
                            onClick={() => canChangeRole ? changeUserRole(participant.user_id, participant.role, participant.username) : undefined}
                            disabled={!canChangeRole}
                            className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1.5 font-medium transition-all duration-200 ${
                              participant.role === 'host'
                                ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/40 shadow-sm'
                                : 'bg-gray-700/80 text-gray-200 hover:bg-gray-600/80'
                            } ${canChangeRole ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default'}`}
                            title={canChangeRole ? `Click to ${participant.role === 'host' ? 'demote to listener' : 'promote to host'}` : ''}
                          >
                            {participant.role === 'host' && (
                              <div className="w-3 h-3 bg-primary/30 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              </div>
                            )}
                            <span className="truncate max-w-16">{participant.username}</span>
                            {participant.role === 'host' && (
                              <span className="text-xs font-bold opacity-90 bg-primary/20 px-1 py-0.5 rounded-sm">HOST</span>
                            )}
                            {canChangeRole && (
                              <div className="w-3 h-3 opacity-60">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={leaveCurrentRoom}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md ml-3"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Create Section */}
          <div className="p-3 border-b border-gray-700/50">
            {!showCreateForm ? (
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  // Auto-fill with random room name
                  const randomName = generateRandomRoomName();
                  if (randomName) {
                    setCreateRoomName(randomName);
                    console.log('Auto-filled room name:', randomName);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary rounded-xl text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] text-sm"
              >
                <div className="p-1 bg-white/20 rounded-full">
                  <PlusIcon className="w-3 h-3" />
                </div>
                <span>Create Room</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createRoomName}
                    onChange={(e) => setCreateRoomName(e.target.value)}
                    placeholder="Room name..."
                    className="flex-1 px-4 py-3 bg-gray-800/80 text-white rounded-xl border border-gray-600/50 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const randomName = generateRandomRoomName();
                      if (randomName) {
                        setCreateRoomName(randomName);
                        console.log('Generated new room name:', randomName);
                      }
                    }}
                    className="px-3 py-3 bg-gray-600/80 hover:bg-gray-500/80 text-white rounded-xl text-sm transition-all duration-200"
                    title="Generate random room name"
                  >
                    🎲
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateRoom}
                    disabled={!createRoomName.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateRoomName('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-600/80 hover:bg-gray-700/80 text-white rounded-xl text-sm font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Available Rooms */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent flex-1"></div>
              <h4 className="text-sm font-semibold text-gray-300 px-3">Available Rooms</h4>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent flex-1"></div>
            </div>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading rooms...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-800/50 rounded-2xl mx-auto max-w-xs mb-4">
                  <UserGroupIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No rooms available</p>
                  <p className="text-gray-500 text-xs mt-1">Create one to get started!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="group flex items-center justify-between p-4 bg-gray-800/60 backdrop-blur-sm rounded-2xl hover:bg-gray-700/80 transition-all duration-200 border border-gray-700/40 hover:border-gray-600/60 shadow-sm hover:shadow-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm truncate">{room.name}</p>
                        {Boolean(room.is_playing) && (
                          <div className="flex items-center gap-1">
                            {room.is_playing ? (
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                <PlayIcon className="w-3 h-3" />
                                <span className="text-xs font-medium">LIVE</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                                <PauseIcon className="w-3 h-3" />
                                <span className="text-xs font-medium">PAUSED</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-xs text-gray-400 mt-1">
                        {(room.host_username || room.host?.username) && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-700/50 rounded-md">
                            <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                            <span className="text-gray-300 font-medium">{room.host_username || room.host?.username}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-700/50 rounded-md">
                          <UserGroupIcon className="w-3 h-3" />
                          <span>{room.participant_count || 0}/{room.max_listeners}</span>
                        </div>
                        {room.current_song && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary rounded-md border border-primary/30 max-w-40">
                            <MusicalNoteIcon className="w-3 h-3 flex-shrink-0" />
                            <div className="truncate">
                              <span className="font-medium text-xs">{room.current_song.title}</span>
                              {room.current_song.artist_name && (
                                <span className="text-xs opacity-80"> • {room.current_song.artist_name}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {room.userRole && (
                        <span className={`px-3 py-1.5 text-xs rounded-xl font-bold shadow-sm ${
                          room.userRole === 'host' 
                            ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/40' 
                            : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/40'
                        }`}>
                          {room.userRole === 'host' ? 'HOST' : 'LISTENING'}
                        </span>
                      )}
                      {user?.is_admin && (
                        <button
                          onClick={() => deleteRoom(room.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
                          title="Delete room (Admin)"
                        >
                          <TrashIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                      {!room.isParticipant ? (
                        <button
                          onClick={() => joinRoom(room.code)}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
                        >
                          Join
                        </button>
                      ) : (
                        <button
                          onClick={() => joinRoom(room.code)}
                          className="px-4 py-2 bg-gray-600/80 hover:bg-gray-700/80 text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Rejoin
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicRoomsPane;