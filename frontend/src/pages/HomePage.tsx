import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Song, Album } from '../types';
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
  ClockIcon,
  MusicalNoteIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  ChevronRightIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
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

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [randomSongs, setRandomSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [addToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null);

  useEffect(() => {
    fetchHomeData();
    fetchUserFavorites();
  }, []);

  const fetchUserFavorites = async () => {
    try {
      const response: any = await apiService.getFavorites();
      const favoriteIds = new Set(response.data?.songs?.map((song: Song) => song.id) || []);
      setFavorites(favoriteIds as Set<number>);
    } catch (error) {
      // Only log non-abort errors to reduce console noise
      if (error.message !== 'Request aborted' && !error.message?.includes('aborted')) {
        console.error('Error fetching favorites:', error);
      }
    }
  };

  const toggleFavorite = async (songId: number) => {
    try {
      await apiService.toggleFavorite(songId);
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(songId)) {
          newFavorites.delete(songId);
        } else {
          newFavorites.add(songId);
        }
        return newFavorites;
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const [recentlyPlayedRes, recentAlbumsRes, randomSongsRes] = await Promise.all([
        apiService.getRecentlyPlayed(6).catch(() => ({ data: { songs: [] } })),
        apiService.getRecentAlbums(6).catch(() => ({ data: { albums: [] } })),
        apiService.getRandomSongs(6).catch(() => ({ data: { songs: [] } }))
      ]);

      setRecentlyPlayed(recentlyPlayedRes.data.songs || []);
      setRecentAlbums(recentAlbumsRes.data.albums || []);
      setRandomSongs(randomSongsRes.data.songs || []);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song: Song, songList: Song[] = [song]) => {
    handleRoomAwarePlayback(song, songList);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Context menu handlers
  const handleContextMenuPlay = (song: Song) => {
    handlePlaySong(song, randomSongs);
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
    toggleFavorite(song.id);
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
    // TODO: Implement edit song functionality
    console.log('Edit song:', song.title);
  };

  const handleContextMenuDelete = (song: Song) => {
    // TODO: Implement delete song functionality with confirmation
    console.log('Delete song:', song.title);
  };

  // Add to playlist modal handlers
  const handleCloseAddToPlaylistModal = () => {
    setAddToPlaylistModalOpen(false);
    setSelectedSongForPlaylist(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          {getGreeting()}
        </h1>
        <p className="text-gray-400">
          Welcome back to your music library
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          onClick={() => navigate('/history')}
          className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-lg cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                Recently Played
              </h3>
              <p className="text-gray-200 text-sm">Pick up where you left off</p>
            </div>
            <ChevronRightIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/library')}
          className="bg-gradient-to-r from-green-600 to-teal-600 p-6 rounded-lg cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <MusicalNoteIcon className="w-5 h-5 mr-2" />
                Your Library
              </h3>
              <p className="text-gray-200 text-sm">Browse your music collection</p>
            </div>
            <ChevronRightIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/search')}
          className="bg-gradient-to-r from-pink-600 to-red-600 p-6 rounded-lg cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                Discover
              </h3>
              <p className="text-gray-200 text-sm">Find new music to enjoy</p>
            </div>
            <ChevronRightIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Recently Played Songs */}
      {recentlyPlayed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <ClockIcon className="w-6 h-6 text-purple-500 mr-3" />
              Recently Played
            </h2>
            <button 
              onClick={() => navigate('/history')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              View all
            </button>
          </div>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="space-y-2 p-4">
              {recentlyPlayed.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  data-song-context-menu
                  onClick={(e) => handleClick(e, () => handlePlaySong(song, recentlyPlayed))}
                  onContextMenu={(e) => handleContextMenu(e, song)}
                  onTouchStart={(e) => handleTouchStart(e, song)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className={`flex items-center p-2 rounded cursor-pointer group ${
                    currentSong?.id === song.id 
                      ? 'bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-50' 
                      : 'hover:bg-gray-700'
                  }`}
                >
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
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded flex items-center justify-center transition-all">
                      <PlayIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artist_name}{song.album_title ? ` • ${song.album_title}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(song.id);
                    }}
                    className="p-1 hover:bg-gray-600 rounded transition-colors mr-2"
                  >
                    {favorites.has(song.id) ? (
                      <HeartIconSolid className="w-4 h-4 text-red-500" />
                    ) : (
                      <HeartIcon className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    )}
                  </button>
                  <span className="text-gray-400 text-sm">
                    {song.duration ? formatDuration(song.duration) : '--:--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Albums */}
      {recentAlbums.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <MusicalNoteIcon className="w-6 h-6 text-green-500 mr-3" />
              Recent Albums
            </h2>
            <button 
              onClick={() => navigate('/library')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {recentAlbums.map((album) => (
              <div 
                key={album.id} 
                className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {album.artwork_path ? (
                  <img
                    src={apiService.getArtworkUrl(album.artwork_path)}
                    alt={album.title}
                    className="w-full aspect-square object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <MusicalNoteIcon className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <h3 className="text-white font-medium text-sm truncate">{album.title}</h3>
                <p className="text-gray-400 text-xs truncate">{album.artist_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Made for You / Discover */}
      {randomSongs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <MagnifyingGlassIcon className="w-6 h-6 text-pink-500 mr-3" />
              Made for You
            </h2>
            <button 
              onClick={() => navigate('/library')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              View all
            </button>
          </div>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="space-y-2 p-4">
              {randomSongs.map((song, index) => (
                <div
                  key={`${song.id}-discover-${index}`}
                  data-song-context-menu
                  onClick={(e) => handleClick(e, () => handlePlaySong(song, randomSongs))}
                  onContextMenu={(e) => handleContextMenu(e, song)}
                  onTouchStart={(e) => handleTouchStart(e, song)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className={`flex items-center p-2 rounded cursor-pointer group ${
                    currentSong?.id === song.id 
                      ? 'bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-50' 
                      : 'hover:bg-gray-700'
                  }`}
                >
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
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded flex items-center justify-center transition-all">
                      <PlayIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artist_name}{song.album_title ? ` • ${song.album_title}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(song.id);
                    }}
                    className="p-1 hover:bg-gray-600 rounded transition-colors mr-2"
                  >
                    {favorites.has(song.id) ? (
                      <HeartIconSolid className="w-4 h-4 text-red-500" />
                    ) : (
                      <HeartIcon className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    )}
                  </button>
                  <span className="text-gray-400 text-sm">
                    {song.duration ? formatDuration(song.duration) : '--:--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        song={contextMenu.song}
        isAdmin={Boolean(user?.is_admin)}
        isFavorited={contextMenu.song ? favorites.has(contextMenu.song.id) : false}
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

export default HomePage;