import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  UserGroupIcon, 
  PlayIcon, 
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  PlusIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { useRoomStore } from '../stores/roomStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import roomWebSocketService from '../services/roomService';

const RoomView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roomStore = useRoomStore();
  const playerStore = usePlayerStore();
  
  const [chatMessage, setChatMessage] = useState('');
  const [showAddSong, setShowAddSong] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!code) {
      navigate('/rooms');
      return;
    }

    // Connect to WebSocket and join room
    const connectAndJoin = async () => {
      try {
        await roomWebSocketService.connect();
        roomWebSocketService.joinRoom(code);
      } catch (error) {
        console.error('Failed to connect to room:', error);
        alert('Failed to connect to room');
        navigate('/rooms');
      }
    };

    connectAndJoin();

    // Cleanup on unmount
    return () => {
      roomWebSocketService.leaveRoom();
    };
  }, [code, navigate]);

  const handleLeaveRoom = () => {
    roomWebSocketService.leaveRoom();
    navigate('/rooms');
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    roomWebSocketService.sendMessage(chatMessage.trim());
    setChatMessage('');
  };

  const handlePlayPause = () => {
    if (!roomStore.isHost()) {
      alert('Only the room host can control playback');
      return;
    }

    if (roomStore.currentRoom?.is_playing) {
      roomWebSocketService.pauseRoom();
    } else {
      const currentSong = roomStore.currentRoom?.current_song;
      if (currentSong) {
        roomWebSocketService.playRoom(currentSong.id, playerStore.currentTime);
      }
    }
  };

  const handleNext = () => {
    if (!roomStore.isHost()) {
      alert('Only the room host can control playback');
      return;
    }

    const queue = roomStore.queue;
    if (queue.length > 0) {
      roomWebSocketService.changeSong(queue[0].song_id);
    }
  };

  const handlePrevious = () => {
    if (!roomStore.isHost()) {
      alert('Only the room host can control playback');
      return;
    }
    // Could implement previous song logic here
  };

  const handleAddSongToQueue = (song: any) => {
    roomWebSocketService.addToQueue(song.id);
    setShowAddSong(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFromQueue = (queueItemId: number) => {
    roomWebSocketService.removeFromQueue(queueItemId);
  };

  if (!roomStore.currentRoom) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeaveRoom}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{roomStore.currentRoom.name}</h1>
            <p className="text-gray-400">
              Code: {roomStore.currentRoom.code} • 
              {roomStore.participants.length}/{roomStore.currentRoom.max_listeners} listeners
              {roomStore.isHost() && <span className="text-green-400 ml-2">• Host</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Now Playing */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MusicalNoteIcon className="w-5 h-5" />
              Now Playing
            </h2>
            
            {roomStore.currentRoom.current_song ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                    <MusicalNoteIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">
                      {roomStore.currentRoom.current_song.title}
                    </h3>
                    <p className="text-gray-400">
                      {roomStore.currentRoom.current_song.artist_name}
                    </p>
                    {roomStore.currentRoom.current_song.album_title && (
                      <p className="text-sm text-gray-500">
                        {roomStore.currentRoom.current_song.album_title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Playback Controls - Only for host */}
                {roomStore.isHost() && (
                  <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={handlePrevious}
                      className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
                    >
                      <BackwardIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                    >
                      {roomStore.currentRoom.is_playing ? (
                        <PauseIcon className="w-6 h-6" />
                      ) : (
                        <PlayIcon className="w-6 h-6" />
                      )}
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
                    >
                      <ForwardIcon className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <MusicalNoteIcon className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No song playing</p>
                {roomStore.isHost() && (
                  <button
                    onClick={() => setShowAddSong(true)}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Add a song
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Queue */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Queue ({roomStore.queue.length})
              </h2>
              <button
                onClick={() => setShowAddSong(true)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Add Song
              </button>
            </div>

            {roomStore.queue.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Queue is empty</p>
                <p className="text-sm text-gray-500">Add songs to get the party started!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roomStore.queue.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-6 text-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-white">{item.song.title}</p>
                        <p className="text-sm text-gray-400">{item.song.artist_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Added by {item.added_by_username}
                      </span>
                      {(roomStore.isHost() || item.added_by === user?.id) && (
                        <button
                          onClick={() => handleRemoveFromQueue(item.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              Participants ({roomStore.participants.length})
            </h2>
            <div className="space-y-2">
              {roomStore.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {participant.username?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <span className="text-white">{participant.username || 'Unknown User'}</span>
                  </div>
                  {participant.user_id === roomStore.currentRoom?.host_id && (
                    <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              Chat
            </h2>
            
            {/* Messages */}
            <div className="h-48 overflow-y-auto mb-4 space-y-2">
              {roomStore.chatMessages.map((message) => (
                <div key={message.id} className="text-sm">
                  <span className="text-blue-400 font-medium">
                    {message.username || 'Unknown User'}:
                  </span>
                  <span className="text-white ml-1">{message.message || ''}</span>
                </div>
              ))}
            </div>

            {/* Send Message */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Song Modal */}
      {showAddSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Add Song to Queue</h3>
              <button
                onClick={() => {
                  setShowAddSong(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a song..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              
              {searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                      onClick={() => handleAddSongToQueue(song)}
                    >
                      <div>
                        <p className="font-medium text-white">{song.title}</p>
                        <p className="text-sm text-gray-400">{song.artist_name}</p>
                      </div>
                      <PlusIcon className="w-5 h-5 text-green-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;