import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerControls from './PlayerControls';
import PlayerInfo from './PlayerInfo';
import PlayerProgress from './PlayerProgress';
import VolumeControl from './VolumeControl';
import EqualizerModal from './EqualizerModal';
import QueueModal from '../QueueModal';
import MusicRoomsPane from '../MusicRoomsPane';
import RoomQueue from '../RoomQueue';
import { QueueListIcon, UserGroupIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';

const Player: React.FC = () => {
  const roomStore = useRoomStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isRoomsPaneOpen, setIsRoomsPaneOpen] = useState(false);
  const [isRoomQueueOpen, setIsRoomQueueOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  
  const isInRoom = roomStore.isInRoom();
  const currentUserParticipant = roomStore.participants.find(p => p.user_id === user?.id);

  return (
    <>
      <div className="bg-gray-900 border-t border-gray-800 p-3 md:p-4">
        {/* Mobile layout - stacked */}
        <div className="md:hidden">
          {/* Top row: Song info + Queue button */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0 pr-3">
              <PlayerInfo />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRoomsPaneOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                title="Music Rooms"
              >
                <UserGroupIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => isInRoom ? setIsRoomQueueOpen(true) : setIsQueueModalOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                title={isInRoom ? 'Room Queue' : 'View Queue'}
              >
                <QueueListIcon className="w-5 h-5" />
                {isInRoom && roomStore.queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {roomStore.queue.length}
                  </span>
                )}
              </button>
              {/* EQ button */}
              <button
                onClick={() => setIsEqualizerOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                title="Equalizer"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
              {/* Volume control hidden on mobile - use native OS controls */}
              <div className="hidden sm:block w-20">
                <VolumeControl />
              </div>
            </div>
          </div>
          
          {/* Bottom row: Controls + Progress */}
          <div className="space-y-2">
            <PlayerControls />
            <PlayerProgress />
          </div>
        </div>

        {/* Desktop layout - horizontal */}
        <div className="hidden md:flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Song info - Left side */}
          <div className="flex-1 min-w-0 max-w-xs">
            <PlayerInfo />
          </div>

          {/* Player controls - Center */}
          <div className="flex-1 flex flex-col items-center max-w-lg">
            <PlayerControls />
            <PlayerProgress />
          </div>

          {/* Volume control and Queue - Right side */}
          <div className="flex-1 flex items-center justify-end gap-4 max-w-xs">
            <button
              onClick={() => setIsRoomsPaneOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
              title="Music Rooms"
            >
              <UserGroupIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => isInRoom ? setIsRoomQueueOpen(true) : setIsQueueModalOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800 relative"
              title={isInRoom ? 'Room Queue' : 'View Queue'}
            >
              <QueueListIcon className="w-5 h-5" />
              {isInRoom && roomStore.queue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {roomStore.queue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsEqualizerOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
              title="Equalizer"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
            <VolumeControl />
          </div>
        </div>
      </div>

      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
      />

      <QueueModal 
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />
      
      <RoomQueue
        isOpen={isRoomQueueOpen}
        onClose={() => setIsRoomQueueOpen(false)}
      />
      
      <MusicRoomsPane
        isOpen={isRoomsPaneOpen}
        onClose={() => setIsRoomsPaneOpen(false)}
      />
    </>
  );
};

export default Player;