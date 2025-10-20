import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  UserGroupIcon, 
  GlobeAltIcon, 
  LockClosedIcon,
  MagnifyingGlassIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';
import { roomApiService } from '../services/roomApi';
import { useRoomStore, Room } from '../stores/roomStore';
import { useAuthStore } from '../stores/authStore';

const Rooms: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roomStore = useRoomStore();
  
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    description: '',
    is_public: true,
    max_listeners: 10
  });
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

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
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.username) return '';
    const randomTemplate = roomNameTemplates[Math.floor(Math.random() * roomNameTemplates.length)];
    return `${currentUser.username}'s ${randomTemplate}`;
  };

  useEffect(() => {
    loadRooms();
    // Auto-fill room name on component mount
    if (!newRoomData.name) {
      const generatedName = generateRandomRoomName();
      if (generatedName) {
        console.log('Auto-filling room name on mount:', generatedName);
        setNewRoomData(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, []);

  // Auto-fill room name when user data becomes available (if not already filled)
  useEffect(() => {
    if (!newRoomData.name && user?.username) {
      const generatedName = generateRandomRoomName();
      if (generatedName) {
        console.log('Auto-filling room name for user:', user.username, generatedName);
        setNewRoomData(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [user?.username]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const [publicResponse, myResponse] = await Promise.all([
        roomApiService.getPublicRooms(),
        roomApiService.getMyRooms()
      ]);
      setPublicRooms(publicResponse.rooms);
      setMyRooms(myResponse.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    if (!code.trim()) return;
    
    setJoinError(null);
    try {
      await roomApiService.joinRoom({ code: code.toUpperCase() });
      navigate(`/rooms/${code.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      setJoinError('Failed to join room. Please check the code and try again.');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.name.trim()) {
      setCreateError('Please enter a room name');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const response = await roomApiService.createRoom(newRoomData);
      setNewRoomData({ name: '', description: '', is_public: true, max_listeners: 10 });
      navigate(`/rooms/${response.room.code}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create room. Please try again.';
      setCreateError(errorMsg.includes('404') ? 'Room creation is not available yet. Backend API not implemented.' : errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinExistingRoom = (room: Room) => {
    navigate(`/rooms/${room.code}`);
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }
    
    try {
      await roomApiService.deleteRoom(roomId);
      // Reload rooms to reflect the deletion
      loadRooms();
    } catch (error) {
      console.error('Failed to delete room:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete room. Please try again.';
      setGeneralError(errorMsg.includes('404') ? 'Room deletion is not available yet. Backend API not implemented.' : errorMsg);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Music Rooms</h1>
        <p className="text-gray-400">Listen to music together in real-time</p>
        {generalError && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {generalError}
            <button 
              onClick={() => setGeneralError(null)} 
              className="ml-2 text-red-300 hover:text-red-100 font-semibold"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Join with Code Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5" />
          Join Room with Code
        </h2>
        {joinError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {joinError}
            <button 
              onClick={() => setJoinError(null)} 
              className="ml-2 text-red-300 hover:text-red-100 font-semibold"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter room code (e.g., ABC123)"
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            maxLength={6}
          />
          <button
            onClick={() => handleJoinRoom(joinCode)}
            disabled={!joinCode.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            Join
          </button>
        </div>
      </div>

      {/* Create Room Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Create New Room
        </h2>
        {createError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {createError}
            <button 
              onClick={() => setCreateError(null)} 
              className="ml-2 text-red-300 hover:text-red-100 font-semibold"
            >
              ×
            </button>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Room Name *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                placeholder="Enter room name"
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setNewRoomData(prev => ({ ...prev, name: generateRandomRoomName() }))}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm transition-colors"
                title="Generate random room name"
              >
                🎲
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newRoomData.description}
              onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Listeners
              </label>
              <input
                type="number"
                value={newRoomData.max_listeners}
                onChange={(e) => setNewRoomData({ ...newRoomData, max_listeners: parseInt(e.target.value) || 10 })}
                min="2"
                max="50"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={newRoomData.is_public}
                  onChange={(e) => setNewRoomData({ ...newRoomData, is_public: e.target.checked })}
                  className="rounded"
                />
                Public Room
              </label>
            </div>
          </div>
          <button
            onClick={handleCreateRoom}
            disabled={!newRoomData.name.trim() || isCreating}
            className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>

      {/* My Rooms Section */}
      {myRooms.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">My Rooms</h2>
          <div className="grid gap-3">
            {myRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                onClick={() => handleJoinExistingRoom(room)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{room.name}</h3>
                    <p className="text-sm text-gray-400">
                      Code: {room.code} • {room.participant_count || 0} listeners
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {room.is_public ? (
                    <GlobeAltIcon className="w-4 h-4 text-green-400" title="Public" />
                  ) : (
                    <LockClosedIcon className="w-4 h-4 text-yellow-400" title="Private" />
                  )}
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                    {room.host?.username || 'Unknown'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors ml-2"
                    title="Delete room"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public Rooms Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <GlobeAltIcon className="w-5 h-5" />
          Public Rooms
        </h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading rooms...</p>
          </div>
        ) : publicRooms.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">No public rooms available</p>
            <p className="text-sm text-gray-500">Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {publicRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                onClick={() => handleJoinExistingRoom(room)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{room.name}</h3>
                    <p className="text-sm text-gray-400">
                      {room.description && `${room.description} • `}
                      Code: {room.code} • {room.participant_count || 0}/{room.max_listeners} listeners
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                    Host: {room.host?.username || 'Unknown'}
                  </span>
                  {room.current_song && (
                    <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">
                      🎵 Playing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Rooms;