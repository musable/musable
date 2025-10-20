import React, { useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';
import roomWebSocketService from '../../services/roomService';

const PlayerProgress: React.FC = () => {
  const { currentTime, duration, seek } = usePlayerStore();
  const roomStore = useRoomStore();
  const { user } = useAuthStore();
  const progressRef = useRef<HTMLDivElement>(null);
  
  // Check if user is in a room and their role
  const isInRoom = roomStore.isInRoom();
  const isHost = roomStore.isHost();

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    
    // Only allow seeking if not in room or if host
    if (isInRoom && !isHost) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    if (isInRoom && isHost) {
      // Host: seek locally and sync to room
      seek(newTime);
      roomWebSocketService.seekRoom(newTime);
    } else {
      // Normal seek when not in room
      seek(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex items-center space-x-3 mt-2">
      {/* Current time */}
      <span className="text-xs text-gray-400 w-10 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Progress bar */}
      <div
        ref={progressRef}
        onClick={handleSeek}
        className={`flex-1 h-1 bg-gray-600 rounded-full group ${
          isInRoom && !isHost ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        title={isInRoom && !isHost ? 'Only hosts can seek' : 'Click to seek'}
      >
        <div
          className="h-full bg-white rounded-full relative transition-all group-hover:bg-primary"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Total duration */}
      <span className="text-xs text-gray-400 w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
};

export default PlayerProgress;