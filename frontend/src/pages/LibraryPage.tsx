import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Album, Song, Artist } from '../types';
import apiService from '../services/api';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { handleRoomAwarePlayback } from '../utils/roomPlayback';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu from '../components/ContextMenu';
import EditSongModal from '../components/EditSongModal';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { useToast } from '../contexts/ToastContext';
import {
  MusicalNoteIcon,
  PlayIcon,
  UserIcon,
  HashtagIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [randomSongs, setRandomSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [addToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { play, setQueue, currentSong, addToQueue } = usePlayerStore();
  const { user } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  useEffect(() => {
    fetchLibraryData();
    fetchUserFavorites();
  }, []);

  const fetchUserFavorites = async () => {
    try {
      const response: any = await apiService.getFavorites();
      const favoriteIds = new Set(response.data?.songs?.map((song: Song) => song.id) || []);
      setFavorites(favoriteIds as Set<number>);
    } catch (error) {
      console.error('Error fetching favorites:', error);
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

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      const [albumsRes, randomSongsRes, artistsRes, genresRes] = await Promise.all([
        apiService.getRecentAlbums(12),
        apiService.getRandomSongs(20),
        apiService.getArtists(),
        apiService.getGenres()
      ]);

      setRecentAlbums(albumsRes.data.albums);
      setRandomSongs(randomSongsRes.data.songs);
      setArtists(artistsRes.data.artists.slice(0, 20));
      setGenres(genresRes.data.genres.slice(0, 15));
    } catch (error) {
      console.error('Error fetching library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaySong = (song: Song, songList: Song[] = [song]) => {
    handleRoomAwarePlayback(song, songList);
  };

  const handlePlayDiscoverSong = (song: Song) => {
    handleRoomAwarePlayback(song, randomSongs);
  };

  // Context menu handlers
  const handleContextMenuPlay = (song: Song) => {
    handlePlaySong(song, randomSongs);
  };

  const handleContextMenuAddToQueue = (song: Song) => {
    addToQueue(song);
  };

  const handleContextMenuAddToPlaylist = (song: Song) => {
    setAddToPlaylistSong(song);
    setAddToPlaylistModalOpen(true);
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
    setEditingSong(song);
    setEditModalOpen(true);
    closeContextMenu();
  };

  const handleContextMenuDelete = (song: Song) => {
    console.log('Delete song:', song.title);
    // TODO: Implement delete song functionality with confirmation
  };

  // Edit modal handlers
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingSong(null);
  };

  const handleSongUpdated = (updatedSong: Song) => {
    // Update the song in random songs
    setRandomSongs(prev => 
      prev.map(song => song.id === updatedSong.id ? updatedSong : song)
    );
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
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Your Library</h1>
        <p className="text-gray-400">Browse your music collection</p>
      </div>

      {/* Recent Albums */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Recent Albums</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recentAlbums.map((album) => (
            <div
              key={album.id}
              onClick={() => navigate(`/album/${album.id}`)}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer hover-lift"
            >
              <div className="aspect-square mb-3 bg-gray-700 rounded-md overflow-hidden">
                {album.artwork_path ? (
                  <img
                    src={album.artwork_path}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicalNoteIcon className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>
              <h3 className="text-white font-medium text-sm mb-1 truncate">{album.title}</h3>
              <p className="text-gray-400 text-xs truncate">{album.artist_name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Navigation */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Explore</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/favorites')}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6 hover:from-purple-500 hover:to-purple-700 transition-all cursor-pointer hover-lift"
          >
            <HeartIcon className="w-12 h-12 text-white mb-3" />
            <h3 className="text-white font-bold text-lg">Favorites</h3>
            <p className="text-purple-200 text-sm">Your liked songs</p>
          </div>

          <div
            onClick={() => navigate('/playlists')}
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 hover:from-green-500 hover:to-green-700 transition-all cursor-pointer hover-lift"
          >
            <MusicalNoteIcon className="w-12 h-12 text-white mb-3" />
            <h3 className="text-white font-bold text-lg">Playlists</h3>
            <p className="text-green-200 text-sm">Your collections</p>
          </div>

          <div
            onClick={() => navigate('/history')}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 hover:from-blue-500 hover:to-blue-700 transition-all cursor-pointer hover-lift"
          >
            <PlayIcon className="w-12 h-12 text-white mb-3" />
            <h3 className="text-white font-bold text-lg">History</h3>
            <p className="text-blue-200 text-sm">Recently played</p>
          </div>

          <div
            onClick={() => navigate('/search')}
            className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg p-6 hover:from-orange-500 hover:to-orange-700 transition-all cursor-pointer hover-lift"
          >
            <HashtagIcon className="w-12 h-12 text-white mb-3" />
            <h3 className="text-white font-bold text-lg">Search</h3>
            <p className="text-orange-200 text-sm">Find music</p>
          </div>
        </div>
      </section>

      {/* Discover Music */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Discover</h2>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Random Songs</h3>
            <p className="text-gray-400 text-sm">Explore your music collection</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {randomSongs.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center p-4 hover:bg-gray-700 transition-colors border-b border-gray-800 last:border-b-0 cursor-pointer"
                onClick={(e) => handleClick(e, () => handlePlayDiscoverSong(song))}
                onContextMenu={(e) => handleContextMenu(e, song)}
                onTouchStart={(e) => handleTouchStart(e, song)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              >
                <div className="w-12 h-12 bg-gray-700 rounded-md overflow-hidden flex-shrink-0 mr-3">
                  {song.artwork_path ? (
                    <img
                      src={song.artwork_path}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicalNoteIcon className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-white font-medium text-sm truncate mb-1">
                    {song.title}
                  </h4>
                  <p className="text-gray-400 text-xs truncate">
                    {song.artist_name} • {song.album_title || 'Unknown Album'}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(song.id);
                    }}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    {favorites.has(song.id) ? (
                      <HeartIconSolid className="w-5 h-5 text-red-400" />
                    ) : (
                      <HeartIcon className="w-5 h-5" />
                    )}
                  </button>

                  <span className="text-gray-400 text-xs">
                    {song.duration ? formatDuration(song.duration) : '--:--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artists */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Artists</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => navigate(`/artist/${artist.id}`)}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer hover-lift text-center"
            >
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-700 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-white font-medium text-sm truncate">{artist.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Genres */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Genres</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {genres.map((genre, index) => (
            <span
              key={index}
              className="px-4 py-2 bg-gray-800 rounded-full text-white text-sm hover:bg-gray-700 transition-colors cursor-pointer"
            >
              {genre}
            </span>
          ))}
        </div>
      </section>

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
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
      />

      {/* Edit Song Modal */}
      <EditSongModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        song={editingSong}
        onSongUpdated={handleSongUpdated}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={addToPlaylistModalOpen}
        onClose={() => setAddToPlaylistModalOpen(false)}
        song={addToPlaylistSong}
      />
    </div>
  );
};

export default LibraryPage;