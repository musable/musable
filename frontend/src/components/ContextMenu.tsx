import React, { useEffect, useRef, useState } from 'react';
import {
  PlayIcon,
  PlusIcon,
  HeartIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  QueueListIcon,
  MusicalNoteIcon,
  XMarkIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { Song, ContextMenuItem } from '../types';
import apiService from '../services/api';
import { useRoomStore } from '../stores/roomStore';
import roomWebSocketService from '../services/roomService';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  song: Song | null;
  isAdmin: boolean;
  isFavorited: boolean;
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onShare: (song: Song) => void;
  onEdit?: (song: Song) => void;
  onDelete?: (song: Song) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  song,
  isAdmin,
  isFavorited,
  onPlay,
  onAddToQueue,
  onAddToPlaylist,
  onToggleFavorite,
  onShare,
  onEdit,
  onDelete
}) => {
  const roomStore = useRoomStore();
  const isInRoom = roomStore.isInRoom();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    // Adjust position to keep menu within viewport
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10;
    }

    setAdjustedPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
  }, [isOpen, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !song) return null;

  const handleAddToRoomQueue = (song: Song) => {
    roomWebSocketService.addToQueue(song.id);
    onClose();
  };

  const menuItems: ContextMenuItem[] = [
    {
      id: 'play',
      label: 'Play Now',
      icon: PlayIcon,
      action: () => onPlay(song),
      disabled: false
    },
    {
      id: 'add-to-queue',
      label: isInRoom ? 'Add to Local Queue' : 'Add to Queue',
      icon: QueueListIcon,
      action: () => onAddToQueue(song),
      disabled: false
    },
    ...(isInRoom ? [{
      id: 'add-to-room-queue',
      label: 'Add to Room Queue',
      icon: UserGroupIcon,
      action: () => handleAddToRoomQueue(song),
      disabled: false
    }] : []),
    {
      id: 'separator-1',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'add-to-playlist',
      label: 'Add to Playlist',
      icon: PlusIcon,
      action: () => onAddToPlaylist(song),
      disabled: false
    },
    {
      id: 'toggle-favorite',
      label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
      icon: isFavorited ? HeartSolidIcon : HeartIcon,
      action: () => onToggleFavorite(song),
      disabled: false
    },
    {
      id: 'share',
      label: 'Share',
      icon: ShareIcon,
      action: () => onShare(song),
      disabled: false
    }
  ];

  // Add admin-only items
  if (isAdmin && onEdit && onDelete) {
    menuItems.push(
      {
        id: 'separator-2',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'edit',
        label: 'Edit Song',
        icon: PencilIcon,
        action: () => onEdit(song),
        disabled: false
      },
      {
        id: 'delete',
        label: 'Delete Song',
        icon: TrashIcon,
        action: () => onDelete(song),
        disabled: false
      }
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 opacity-0 animate-fade-in select-none"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        animation: 'fadeIn 0.15s ease-out forwards'
      }}
    >
      {/* Song info header */}
      <div className="px-3 py-2 border-b border-gray-700 mb-1">
        <div className="flex items-center gap-3">
          {song.artwork_path ? (
            <img
              src={apiService.getArtworkUrl(song.artwork_path)}
              alt={song.album_title || 'Album artwork'}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
              <MusicalNoteIcon className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{song.title}</p>
            <p className="text-gray-400 text-xs truncate">{song.artist_name}</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      {menuItems.map((item) => {
        if (item.separator) {
          return (
            <div key={item.id} className="h-px bg-gray-700 my-1 mx-2" />
          );
        }

        const Icon = item.icon!;
        const isDestructive = item.id === 'delete';

        return (
          <button
            key={item.id}
            onClick={() => {
              item.action();
              onClose();
            }}
            disabled={item.disabled}
            className={clsx(
              'w-full px-3 py-2 flex items-center gap-3 text-sm transition-colors',
              'hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
              isDestructive
                ? 'text-red-400 hover:text-red-300'
                : 'text-gray-300 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;