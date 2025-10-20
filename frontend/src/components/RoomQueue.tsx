import React, { useState } from 'react';
import {
  MusicalNoteIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  QueueListIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useRoomStore } from '../stores/roomStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import roomWebSocketService from '../services/roomService';
import { apiService } from '../services/api';
import clsx from 'clsx';

interface RoomQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

const RoomQueue: React.FC<RoomQueueProps> = ({ isOpen, onClose }) => {
  const roomStore = useRoomStore();
  const { currentSong } = usePlayerStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isHost = roomStore.isHost();
  const currentUserParticipant = roomStore.participants.find(p => p.user_id === user?.id);

  // Search for songs to add to queue
  const searchSongs = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiService.request('GET', `/songs/search?q=${encodeURIComponent(query)}&limit=10`);
      setSearchResults((response as any).songs || []);
    } catch (error) {
      console.error('Failed to search songs:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add song to room queue
  const addToQueue = (song: any) => {
    roomWebSocketService.addToQueue(song.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove song from queue
  const removeFromQueue = (queueItemId: number) => {
    // Find the queue item to check ownership
    const queueItem = roomStore.queue.find(item => item.id === queueItemId);
    if (!queueItem) return;
    
    // Allow hosts to remove any song, or users to remove their own songs
    if (!isHost && queueItem.added_by !== user?.id) return;
    
    roomWebSocketService.removeFromQueue(queueItemId);
  };

  // Play specific song from queue (host only)
  const playSong = (song: any) => {
    if (!isHost) return;
    roomWebSocketService.changeSong(song.song_id);
  };

  if (!isOpen || !roomStore.currentRoom) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl w-full max-w-md max-h-[32rem] flex flex-col shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/70 bg-gray-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <QueueListIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Room Queue</h3>
              <p className="text-xs text-gray-400">{roomStore.currentRoom.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-700/50 transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Add to Queue Section */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-white">Add to Queue</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchSongs(e.target.value);
              }}
              placeholder="Search for songs to add..."
              className="w-full px-3 py-2 bg-gray-800/80 text-white rounded-xl border border-gray-600/50 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"
            />
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1">
                {searchResults.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => addToQueue(song)}
                    className="w-full flex items-center justify-between p-2 bg-gray-700/60 hover:bg-gray-600/80 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MusicalNoteIcon className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{song.title}</p>
                        <p className="text-gray-400 text-xs truncate">{song.artist_name}</p>
                      </div>
                    </div>
                    <PlusIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="text-center py-2">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {roomStore.queue.length === 0 ? (
              <div className="text-center py-8">
                <QueueListIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Queue is empty</p>
                <p className="text-gray-500 text-xs mt-1">Add some songs to get started!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roomStore.queue.map((item, index) => (
                  <div
                    key={item.id}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                      item.song_id === currentSong?.id && 
                      roomStore.queue.findIndex(queueItem => queueItem.song_id === currentSong?.id) === index
                        ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/40'
                        : 'bg-gray-800/60 hover:bg-gray-700/80'
                    )}
                  >
                    {/* Position indicator */}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700/80 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-300">{index + 1}</span>
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{item.song.title}</p>
                        {item.song_id === currentSong?.id && 
                         roomStore.queue.findIndex(queueItem => queueItem.song_id === currentSong?.id) === index && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/30 text-primary rounded-full">
                            <PlayIcon className="w-3 h-3" />
                            <span className="text-xs font-bold">NOW</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs truncate">{item.song.artist_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-700/50 rounded-md">
                          <UserIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-300">{item.added_by_username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Play button (host only) */}
                      {isHost && !(item.song_id === currentSong?.id && 
                        roomStore.queue.findIndex(queueItem => queueItem.song_id === currentSong?.id) === index) && (
                        <button
                          onClick={() => playSong(item)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/20 rounded-lg transition-all duration-200"
                          title="Play this song"
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove button - hosts can delete any item, users only their own */}
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className={clsx(
                          "p-2 rounded-lg transition-all duration-200",
                          (isHost || item.added_by === user?.id)
                            ? "text-gray-400 hover:text-red-400 hover:bg-red-500/20" 
                            : "text-gray-600 cursor-not-allowed opacity-50"
                        )}
                        disabled={!isHost && item.added_by !== user?.id}
                        title={
                          isHost 
                            ? item.added_by === user?.id ? "Remove your song" : "Remove from queue (host)"
                            : item.added_by === user?.id ? "Remove your song" : "Only hosts can remove other's songs"
                        }
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Queue Stats Footer */}
        <div className="p-3 border-t border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{roomStore.queue.length} songs in queue</span>
            {roomStore.queue.length > 0 && (
              <span>
                Total: {Math.floor(roomStore.queue.reduce((total, item) => total + (item.song.duration || 0), 0) / 60)}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomQueue;