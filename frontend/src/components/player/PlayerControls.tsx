import React, { useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  ArrowPathRoundedSquareIcon,
  ArrowsRightLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/solid';
import { usePlayerStore } from '../../stores/playerStore';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';
import roomWebSocketService from '../../services/roomService';
import { handleRoomAwareNext } from '../../utils/roomPlayback';
import clsx from 'clsx';

const PlayerControls: React.FC = () => {
  const {
    isPlaying,
    isShuffled,
    repeatMode,
    isLoading,
    currentSong,
    currentTime,
    play,
    pause,
    next,
    previous,
    toggleShuffle,
    cycleRepeatMode
  } = usePlayerStore();
  
  const roomStore = useRoomStore();
  const { user } = useAuthStore();

  // Check if user is in a room and their role
  const isInRoom = roomStore.isInRoom();
  const isHost = roomStore.isHost();
  const currentUserParticipant = roomStore.participants.find(p => p.user_id === user?.id);
  const userRole = currentUserParticipant?.role;

  // For listeners: track if they paused locally (so we can auto-resync)
  const [isLocallyPaused, setIsLocallyPaused] = React.useState(false);

  const handlePlayPause = () => {
    if (isInRoom) {
      if (isHost) {
        // Host controls: sync to room
        if (isPlaying) {
          roomWebSocketService.pauseRoom();
        } else {
          roomWebSocketService.playRoom(currentSong?.id, currentTime);
        }
      } else {
        // Listener controls: local pause only, with auto-resync on play
        if (isPlaying) {
          pause();
          setIsLocallyPaused(true);
        } else {
          // Request sync from host when resuming
          roomWebSocketService.requestSync();
          setIsLocallyPaused(false);
        }
      }
    } else {
      // Normal playback when not in room
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    }
  };
  
  const handleNext = () => {
    // Use the same room-aware logic for manual next as for automatic next
    handleRoomAwareNext();
  };
  
  const handlePrevious = () => {
    if (isInRoom && isHost) {
      // Find previous song in room queue
      const currentIndex = roomStore.queue.findIndex(item => item.song_id === currentSong?.id);
      if (currentIndex > 0) {
        const prevSong = roomStore.queue[currentIndex - 1];
        roomWebSocketService.changeSong(prevSong.song_id);
      } else {
        // Restart current song
        roomWebSocketService.seekRoom(0);
      }
    } else if (!isInRoom) {
      previous();
    }
  };


  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto">
      {/* Left side - Room indicator or spacer */}
      <div className="flex items-center w-20 justify-start">
        {isInRoom && (
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-lg border border-primary/40">
            <UserGroupIcon className="w-4 h-4" />
            <span className="text-xs font-bold">{userRole?.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Center - Main control buttons */}
      <div className="flex items-center justify-center space-x-3 md:space-x-4">
        {/* Shuffle button - only show when not in room */}
        {!isInRoom && (
          <button
            onClick={toggleShuffle}
            className={clsx(
              'p-2 md:p-1 rounded transition-colors',
              isShuffled 
                ? 'text-primary hover:text-secondary' 
                : 'text-gray-400 hover:text-white'
            )}
            title={isShuffled ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <ArrowsRightLeftIcon className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={isInRoom && !isHost}
          className={clsx(
            'p-2 md:p-1 transition-colors',
            isInRoom && !isHost
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
          )}
          title={isInRoom && !isHost ? 'Only hosts can skip songs' : 'Previous song'}
        >
          <BackwardIcon className="w-6 h-6 md:w-5 md:h-5" />
        </button>

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className={clsx(
            'w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all',
            'bg-white text-black hover:bg-gray-200 hover:scale-105',
            isLoading && 'opacity-50 cursor-not-allowed',
            isInRoom && !isHost && isLocallyPaused && 'ring-2 ring-yellow-400 ring-opacity-60'
          )}
          title={
            isInRoom && !isHost
              ? isPlaying
                ? 'Pause locally (will auto-sync when you resume)'
                : 'Resume and sync with room'
              : isPlaying
              ? 'Pause'
              : 'Play'
          }
        >
          {isLoading ? (
            <div className="w-5 h-5 md:w-4 md:h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <PauseIcon className="w-5 h-5 md:w-4 md:h-4" />
          ) : (
            <PlayIcon className="w-5 h-5 md:w-4 md:h-4 ml-0.5" />
          )}
        </button>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={isInRoom && !isHost}
          className={clsx(
            'p-2 md:p-1 transition-colors',
            isInRoom && !isHost
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
          )}
          title={isInRoom && !isHost ? 'Only hosts can skip songs' : 'Next song'}
        >
          <ForwardIcon className="w-6 h-6 md:w-5 md:h-5" />
        </button>

        {/* Repeat button - hidden in room mode */}
        {!isInRoom && (
          <button
            onClick={cycleRepeatMode}
            className={clsx(
              'p-2 md:p-1 rounded transition-colors relative',
              repeatMode !== 'none' 
                ? 'text-primary hover:text-secondary' 
                : 'text-gray-400 hover:text-white'
            )}
            title={`Repeat: ${repeatMode}`}
          >
            <ArrowPathRoundedSquareIcon className="w-5 h-5 md:w-4 md:h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-xs font-bold bg-primary text-white rounded-full w-3 h-3 flex items-center justify-center">
                1
              </span>
            )}
          </button>
        )}
      </div>

      {/* Right side - Spacer for centering */}
      <div className="flex items-center w-20 justify-end">
      </div>
    </div>
  );
};

export default PlayerControls;