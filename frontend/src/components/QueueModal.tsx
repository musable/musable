import React from 'react';
import { Song } from '../types';
import { usePlayerStore } from '../stores/playerStore';
import { useRoomStore } from '../stores/roomStore';
import roomWebSocketService from '../services/roomService';
import { useToast } from '../contexts/ToastContext';
import {
  XMarkIcon,
  MusicalNoteIcon,
  PlayIcon,
  TrashIcon,
  QueueListIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiService from '../services/api';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QueueModal: React.FC<QueueModalProps> = ({ isOpen, onClose }) => {
  const { queue, currentIndex, currentSong, play, removeFromQueue, clearQueue, setQueue } = usePlayerStore();
  const roomStore = useRoomStore();
  const { showSuccess } = useToast();

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaySong = (song: Song, index: number) => {
    console.log('🎵 HandlePlaySong called with song:', song.id, song.title);
    
    // Check room permissions
    const isInRoom = roomStore.isInRoom();
    const isHost = roomStore.isHost();
    
    if (isInRoom && !isHost) {
      // Listeners cannot play songs directly - only add to room queue
      roomWebSocketService.addToQueue(song.id);
      showSuccess(`Added "${song.title}" to room queue`);
      return;
    }
    
    // Set up local queue and play for both host and non-room users
    setQueue(queue, index);
    play(song);
    
    if (isInRoom && isHost) {
      // Host: also sync song change to room
      roomWebSocketService.changeSong(song.id);
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    removeFromQueue(index);
  };

  if (!isOpen) return null;

  const upcomingSongs = queue.slice(currentIndex + 1);
  const previousSongs = queue.slice(0, currentIndex);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <QueueListIcon className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-xl font-bold text-white">Queue</h2>
            <span className="ml-2 text-sm text-gray-400">({queue.length} songs)</span>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={() => {
                  clearQueue();
                  onClose();
                }}
                className="px-3 py-1 text-sm text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {queue.length === 0 ? (
            <div className="text-center py-12">
              <QueueListIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">No songs in queue</h3>
              <p className="text-gray-500">
                Songs you play will appear here. Start playing music to build your queue.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Now Playing */}
              {currentSong && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wider">
                    Now Playing
                  </h3>
                  <div className="flex items-center p-3 bg-primary/20 border border-primary/30 rounded-lg">
                    <div className="relative mr-3">
                      {currentSong.artwork_path ? (
                        <img
                          src={apiService.getArtworkUrl(currentSong.artwork_path)}
                          alt={currentSong.album_title || 'Album artwork'}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                          <MusicalNoteIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                        <PlayIcon className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{currentSong.title}</p>
                      <p className="text-gray-400 text-sm truncate">
                        {currentSong.artist_name}{currentSong.album_title ? ` • ${currentSong.album_title}` : ''}
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {currentSong.duration ? formatDuration(currentSong.duration) : '--:--'}
                    </span>
                  </div>
                </div>
              )}

              {/* Up Next */}
              {upcomingSongs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wider">
                    Up Next ({upcomingSongs.length} songs)
                  </h3>
                  <div className="space-y-2">
                    {upcomingSongs.map((song, index) => {
                      const queueIndex = currentIndex + 1 + index;
                      return (
                        <div
                          key={`${song.id}-${queueIndex}`}
                          className="flex items-center p-2 rounded hover:bg-gray-700 transition-colors group"
                        >
                          <div className="w-8 text-center">
                            <span className="text-gray-500 text-sm">{index + 1}</span>
                          </div>
                          <div className="relative mr-3">
                            {song.artwork_path ? (
                              <img
                                src={apiService.getArtworkUrl(song.artwork_path)}
                                alt={song.album_title || 'Album artwork'}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                                <MusicalNoteIcon className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{song.title}</p>
                            <p className="text-gray-400 text-sm truncate">
                              {song.artist_name}{song.album_title ? ` • ${song.album_title}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handlePlaySong(song, queueIndex)}
                              className="p-1 hover:bg-gray-600 rounded transition-colors"
                              title="Play now"
                            >
                              <PlayIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                            <button
                              onClick={() => handleRemoveFromQueue(queueIndex)}
                              className="p-1 hover:bg-gray-600 rounded transition-colors"
                              title="Remove from queue"
                            >
                              <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
                            </button>
                          </div>
                          <span className="text-gray-400 text-sm ml-2">
                            {song.duration ? formatDuration(song.duration) : '--:--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Previously Played */}
              {previousSongs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wider">
                    Previously Played ({previousSongs.length} songs)
                  </h3>
                  <div className="space-y-2">
                    {previousSongs.reverse().map((song, index) => {
                      const queueIndex = previousSongs.length - 1 - index;
                      return (
                        <div
                          key={`${song.id}-${queueIndex}`}
                          className="flex items-center p-2 rounded hover:bg-gray-700 transition-colors group opacity-60"
                        >
                          <div className="w-8 text-center">
                            <span className="text-gray-500 text-sm">{previousSongs.length - index}</span>
                          </div>
                          <div className="relative mr-3">
                            {song.artwork_path ? (
                              <img
                                src={apiService.getArtworkUrl(song.artwork_path)}
                                alt={song.album_title || 'Album artwork'}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                                <MusicalNoteIcon className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 font-medium truncate">{song.title}</p>
                            <p className="text-gray-500 text-sm truncate">
                              {song.artist_name}{song.album_title ? ` • ${song.album_title}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handlePlaySong(song, queueIndex)}
                              className="p-1 hover:bg-gray-600 rounded transition-colors"
                              title="Play again"
                            >
                              <PlayIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                          </div>
                          <span className="text-gray-500 text-sm ml-2">
                            {song.duration ? formatDuration(song.duration) : '--:--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueModal;