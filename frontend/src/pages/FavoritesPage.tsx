import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import apiService from '../services/api';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { handleRoomAwarePlayback } from '../utils/roomPlayback';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu from '../components/ContextMenu';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { useToast } from '../contexts/ToastContext';
import {
  HeartIcon,
  MusicalNoteIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const FavoritesPage: React.FC = () => {
  const { play, setQueue, currentSong, addToQueue } = usePlayerStore();
  const { user } = useAuthStore();
  const roomStore = useRoomStore();
  const { showSuccess } = useToast();
  const {
    contextMenu,
    closeContextMenu,
    handleContextMenu,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleClick
  } = useContextMenu();
  
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response: any = await apiService.getFavorites();
      setFavorites(response.data?.songs || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song: Song, songList: Song[] = [song]) => {
    handleRoomAwarePlayback(song, songList);
  };

  const handleRemoveFromFavorites = async (event: any, songId: number) => {
    event.stopPropagation(); // Prevent row click from triggering
    try {
      await apiService.removeFromFavorites(songId);
      setFavorites(favorites.filter(song => song.id !== songId));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Context menu handlers
  const handleContextMenuPlay = (song: Song) => {
    handlePlaySong(song, favorites);
  };

  const handleContextMenuAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const handleContextMenuAddToPlaylist = (song: Song) => {
    console.log('Add to playlist:', song.title);
    setSelectedSongForPlaylist(song);
    setAddToPlaylistModalOpen(true);
    closeContextMenu();
  };

  const handleContextMenuToggleFavorite = (song: Song) => {
    handleRemoveFromFavorites(new Event('click'), song.id);
  };

  const handleContextMenuShare = async (song: Song) => {
    try {
      const response = await apiService.createShareToken(song.id);
      const shareUrl = response.data.shareUrl;
      
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Share URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to create share URL:', err);
      // Fallback to copying song info
      const shareText = `🎵 ${song.title} by ${song.artist_name}`;
      try {
        await navigator.clipboard.writeText(shareText);
        showSuccess('Song info copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Failed to copy to clipboard:', clipboardErr);
        showSuccess('Failed to copy share URL. Please try again.');
      }
    }
  };

  const handleContextMenuEdit = (song: Song) => {
    console.log('Edit song:', song.title);
    // TODO: Implement edit song functionality
  };

  const handleContextMenuDelete = (song: Song) => {
    console.log('Delete song:', song.title);
    // TODO: Implement delete song functionality with confirmation
  };

  // Add to playlist modal handlers
  const handleCloseAddToPlaylistModal = () => {
    setAddToPlaylistModalOpen(false);
    setSelectedSongForPlaylist(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="px-4 md:px-0">
        <div className="flex items-center mb-2">
          <HeartIconSolid className="w-6 h-6 md:w-8 md:h-8 text-red-500 mr-3" />
          <h1 className="text-2xl md:text-4xl font-bold text-white">Liked Songs</h1>
        </div>
        <p className="text-gray-400 text-sm md:text-base">
          {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
        </p>
      </div>

      {/* Favorites List */}
      {favorites.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-12"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Artist</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Album</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {favorites.map((song) => (
                    <tr
                      key={song.id}
                      data-song-context-menu
                      onClick={(e) => handleClick(e, () => handlePlaySong(song, favorites))}
                      onContextMenu={(e) => handleContextMenu(e, song)}
                      onTouchStart={(e) => handleTouchStart(e, song)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                      className={`group cursor-pointer ${
                        currentSong?.id === song.id 
                          ? 'bg-red-500 bg-opacity-20 border-l-4 border-red-500' 
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handlePlaySong(song, favorites)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <PlayIcon className="w-4 h-4 ml-0.5" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {song.artwork_path ? (
                            <img
                              src={apiService.getArtworkUrl(song.artwork_path)}
                              alt={song.album_title || 'Album artwork'}
                              className="w-10 h-10 rounded object-cover mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center mr-3">
                              <MusicalNoteIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{song.title}</p>
                            {song.genre && <p className="text-sm text-gray-400">{song.genre}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">{song.artist_name || 'Unknown Artist'}</td>
                      <td className="px-4 py-3 text-gray-300">{song.album_title || 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {song.duration ? formatDuration(song.duration) : '--:--'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => handleRemoveFromFavorites(e, song.id)}
                          className="p-1 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from favorites"
                        >
                          <HeartIconSolid className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 px-4">
            {favorites.map((song) => (
              <div
                key={song.id}
                data-song-context-menu
                onClick={(e) => handleClick(e, () => handlePlaySong(song, favorites))}
                onContextMenu={(e) => handleContextMenu(e, song)}
                onTouchStart={(e) => handleTouchStart(e, song)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                className={`group relative bg-gray-800 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  currentSong?.id === song.id 
                    ? 'bg-red-500 bg-opacity-20 border-l-4 border-red-500' 
                    : 'hover:bg-gray-700 active:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Album Artwork */}
                  <div className="flex-shrink-0 relative">
                    {song.artwork_path ? (
                      <img
                        src={apiService.getArtworkUrl(song.artwork_path)}
                        alt={song.album_title || 'Album artwork'}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                        <MusicalNoteIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    {/* Play button overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(song, favorites);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                    </button>
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{song.title}</h3>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artist_name || 'Unknown Artist'}
                      {song.album_title && ` • ${song.album_title}`}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      {song.genre && (
                        <span className="mr-2">{song.genre}</span>
                      )}
                      <span>{song.duration ? formatDuration(song.duration) : '--:--'}</span>
                    </div>
                  </div>

                  {/* Remove from favorites button */}
                  <button
                    onClick={(e) => handleRemoveFromFavorites(e, song.id)}
                    className="flex-shrink-0 p-2 text-red-500 hover:text-red-400 transition-colors"
                    title="Remove from favorites"
                  >
                    <HeartIconSolid className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 px-4">
          <HeartIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-medium text-gray-300 mb-2">No liked songs yet</h3>
          <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto">
            Songs you like will appear here. Tap the heart icon next to any song to add it to your favorites.
          </p>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        song={contextMenu.song}
        isAdmin={Boolean(user?.is_admin)}
        isFavorited={true} // All songs in favorites are favorited by definition
        onPlay={handleContextMenuPlay}
        onAddToQueue={handleContextMenuAddToQueue}
        onAddToPlaylist={handleContextMenuAddToPlaylist}
        onToggleFavorite={handleContextMenuToggleFavorite}
        onShare={handleContextMenuShare}
        onEdit={user?.is_admin ? handleContextMenuEdit : undefined}
        onDelete={user?.is_admin ? handleContextMenuDelete : undefined}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={addToPlaylistModalOpen}
        onClose={handleCloseAddToPlaylistModal}
        song={selectedSongForPlaylist}
      />
    </div>
  );
};

export default FavoritesPage;