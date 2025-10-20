import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Playlist, PlaylistSong, Song } from '../types';
import apiService from '../services/api';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useFollowedPlaylistsStore } from '../stores/followedPlaylistsStore';
import { handleRoomAwarePlayback } from '../utils/roomPlayback';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu from '../components/ContextMenu';
import EditPlaylistModal from '../components/EditPlaylistModal';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { useToast } from '../contexts/ToastContext';
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  UserIcon,
  LockClosedIcon,
  GlobeAltIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  PlayIcon as PlayIconSolid
} from '@heroicons/react/24/solid';

const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  const { play, pause, currentSong, addToQueue, setQueue } = usePlayerStore();
  const { user } = useAuthStore();
  const roomStore = useRoomStore();
  const { showSuccess, showError } = useToast();
  const { isFollowing, toggleFollow, loadFollowedPlaylists } = useFollowedPlaylistsStore();
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
    if (id) {
      fetchPlaylistData();
      fetchUserFavorites();
      loadFollowedPlaylists();
    }
  }, [id, loadFollowedPlaylists]);

  useEffect(() => {
    // Update playing state based on current song
    if (currentSong && songs.length > 0) {
      const isCurrentPlaylistPlaying = songs.some(song => song.song_id === currentSong.id);
      setIsPlaying(isCurrentPlaylistPlaying);
    } else {
      setIsPlaying(false);
    }
  }, [currentSong, songs]);

  const fetchPlaylistData = async () => {
    try {
      setLoading(true);
      const playlistRes = await apiService.getPlaylist(parseInt(id!));

      setPlaylist(playlistRes.data.playlist);
      setSongs(playlistRes.data.songs || []);
    } catch (error) {
      console.error('Error fetching playlist data:', error);
      showError('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

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
      showError('Failed to update favorite');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = (): string => {
    const totalSeconds = songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handlePlayPlaylist = () => {
    if (songs.length === 0) return;
    
    const songList = songs.map(playlistSong => ({
      id: playlistSong.song_id,
      title: playlistSong.title,
      artist_name: playlistSong.artist_name,
      album_title: playlistSong.album_title,
      duration: playlistSong.duration,
      artwork_path: playlistSong.artwork_path,
      file_path: '', // Will be fetched when playing
      artist_id: 0,
      source: 'local' as const,
      created_at: '',
      updated_at: ''
    }));

    if (isPlaying) {
      pause();
    } else {
      handleRoomAwarePlaybook(songList[0], songList);
    }
  };

  const handleShufflePlay = () => {
    if (songs.length === 0) return;
    
    const songList = songs.map(playlistSong => ({
      id: playlistSong.song_id,
      title: playlistSong.title,
      artist_name: playlistSong.artist_name,
      album_title: playlistSong.album_title,
      duration: playlistSong.duration,
      artwork_path: playlistSong.artwork_path,
      file_path: '',
      artist_id: 0,
      source: 'local' as const,
      created_at: '',
      updated_at: ''
    }));

    // Shuffle the array
    const shuffledSongs = [...songList].sort(() => Math.random() - 0.5);
    handleRoomAwarePlaybook(shuffledSongs[0], shuffledSongs);
  };

  const handlePlaySong = (song: PlaylistSong, index: number) => {
    const songList = songs.map(playlistSong => ({
      id: playlistSong.song_id,
      title: playlistSong.title,
      artist_name: playlistSong.artist_name,
      album_title: playlistSong.album_title,
      duration: playlistSong.duration,
      artwork_path: playlistSong.artwork_path,
      file_path: '',
      artist_id: 0,
      source: 'local' as const,
      created_at: '',
      updated_at: ''
    }));

    // Start from the selected song
    const reorderedSongs = [...songList.slice(index), ...songList.slice(0, index)];
    handleRoomAwarePlaybook(reorderedSongs[0], reorderedSongs);
  };

  const handleRoomAwarePlaybook = (song: Song, songList: Song[]) => {
    handleRoomAwarePlayback(song, songList);
  };

  const convertPlaylistSongToSong = (playlistSong: PlaylistSong): Song => ({
    id: playlistSong.song_id,
    title: playlistSong.title,
    artist_name: playlistSong.artist_name,
    album_title: playlistSong.album_title,
    duration: playlistSong.duration,
    artwork_path: playlistSong.artwork_path,
    file_path: '',
    artist_id: 0,
    source: 'local' as const,
    created_at: '',
    updated_at: ''
  });

  const handleRemoveFromPlaylist = async (songId: number) => {
    try {
      await apiService.removeSongFromPlaylist(parseInt(id!), songId);
      setSongs(prev => prev.filter(song => song.song_id !== songId));
      showSuccess('Song removed from playlist');
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      showError('Failed to remove song from playlist');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist) return;
    
    if (window.confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) {
      try {
        await apiService.deletePlaylist(playlist.id);
        showSuccess('Playlist deleted');
        navigate('/playlists');
      } catch (error) {
        console.error('Error deleting playlist:', error);
        showError('Failed to delete playlist');
      }
    }
  };

  const handleSharePlaylist = async () => {
    try {
      const shareUrl = `${window.location.origin}/playlist/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Playlist URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showError('Failed to copy URL');
    }
  };

  const handleToggleFollow = async () => {
    if (playlist) {
      try {
        const isNowFollowing = await toggleFollow(playlist);
        showSuccess(isNowFollowing ? 'Playlist followed!' : 'Playlist unfollowed!');
      } catch (error) {
        console.error('Failed to toggle playlist follow:', error);
        showError('Failed to update playlist follow status');
      }
    }
  };

  // Context menu handlers
  const handleContextMenuPlay = (song: Song) => {
    const playlistSong = songs.find(s => s.song_id === song.id);
    if (playlistSong) {
      const index = songs.findIndex(s => s.song_id === song.id);
      handlePlaySong(playlistSong, index);
    }
  };

  const handleContextMenuAddToQueue = (song: Song) => {
    addToQueue(song);
    showSuccess('Added to queue');
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
      const shareText = `🎵 ${song.title} by ${song.artist_name}`;
      try {
        await navigator.clipboard.writeText(shareText);
        showSuccess('Song info copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Failed to copy to clipboard:', clipboardErr);
        showError('Failed to copy share URL');
      }
    }
  };

  const handleContextMenuRemove = (song: Song) => {
    if (window.confirm(`Remove "${song.title}" from this playlist?`)) {
      handleRemoveFromPlaylist(song.id);
    }
    closeContextMenu();
  };

  const canEditPlaylist = user && (user.id === playlist?.user_id || Boolean(user.is_admin));
  const canFollowPlaylist = user && playlist && user.id !== playlist.user_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-4">Playlist not found</h2>
        <button
          onClick={() => navigate('/playlists')}
          className="text-blue-400 hover:text-blue-300"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="px-4 md:px-0">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 md:gap-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/playlists')}
            className="lg:hidden flex items-center text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Playlists
          </button>

          {/* Playlist Cover */}
          <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 mx-auto lg:mx-0 flex-shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-xl flex items-center justify-center">
              <div className="text-center">
                <PlayIconSolid className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-white mx-auto mb-2" />
                <p className="text-white text-xs sm:text-sm font-medium">Playlist</p>
              </div>
            </div>
          </div>

          {/* Playlist Info */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-xs md:text-sm text-gray-400 mb-1 md:mb-2">Playlist</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2 md:mb-4 break-words">
              {playlist.name}
            </h1>
          
          {playlist.description && (
            <p className="text-gray-300 mb-3 md:mb-4 max-w-2xl text-sm md:text-base">
              {playlist.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 md:gap-4 text-xs md:text-sm text-gray-400 mb-4 md:mb-6">
            <div className="flex items-center gap-1">
              <UserIcon className="w-3 h-3 md:w-4 md:h-4" />
              <span>{playlist.username}</span>
            </div>
            
            <div className="flex items-center gap-1">
              {playlist.is_public ? (
                <>
                  <GlobeAltIcon className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Private</span>
                </>
              )}
            </div>

            <span className="hidden sm:inline">•</span>
            <span>{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
            
            {songs.length > 0 && (
              <>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{getTotalDuration()}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
            {songs.length > 0 && (
              <>
                <button
                  onClick={handlePlayPlaylist}
                  className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-medium transition-colors text-sm md:text-base"
                >
                  {isPlaying ? (
                    <PauseIcon className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <PlayIcon className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={handleShufflePlay}
                  className="flex items-center gap-2 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 px-3 md:px-4 py-2 md:py-3 rounded-full transition-colors text-sm md:text-base"
                >
                  <ArrowsRightLeftIcon className="w-4 h-4 md:w-5 md:h-5" />
                  Shuffle
                </button>
              </>
            )}

            {canFollowPlaylist && (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-full border-2 transition-colors text-sm md:text-base ${
                  isFollowing(playlist?.id || 0)
                    ? 'border-primary text-primary hover:bg-primary hover:text-black'
                    : 'border-gray-400 text-gray-400 hover:border-white hover:text-white'
                }`}
                title={isFollowing(playlist?.id || 0) ? 'Unfollow Playlist' : 'Follow Playlist'}
              >
                {isFollowing(playlist?.id || 0) ? (
                  <HeartIconSolid className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <HeartIcon className="w-4 h-4 md:w-5 md:h-5" />
                )}
                <span className="font-medium hidden sm:inline">
                  {isFollowing(playlist?.id || 0) ? 'Following' : 'Follow'}
                </span>
              </button>
            )}

            {canEditPlaylist && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="p-2 md:p-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-full transition-colors"
                  title="Edit playlist"
                >
                  <PencilIcon className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <button
                  onClick={handleSharePlaylist}
                  className="p-2 md:p-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-full transition-colors"
                  title="Share playlist"
                >
                  <ShareIcon className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <button
                  onClick={handleDeletePlaylist}
                  className="p-2 md:p-3 text-red-400 hover:text-red-300 border border-red-600 hover:border-red-500 rounded-full transition-colors"
                  title="Delete playlist"
                >
                  <TrashIcon className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Desktop Back Button */}
      <div className="px-4 md:px-0">
        <button
          onClick={() => navigate('/playlists')}
          className="hidden lg:flex items-center text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Playlists
        </button>
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-0">
        {songs.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-gray-800 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Title</div>
                <div className="col-span-3">Album</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-1"></div>
              </div>

              {/* Desktop Songs */}
              <div className="divide-y divide-gray-700">
                {songs.map((song, index) => (
                  <div
                    key={`${song.song_id}-${song.position}`}
                    className="group px-6 py-3 hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={(e) => handleClick(e, () => handlePlaySong(song, index))}
                    onContextMenu={(e) => handleContextMenu(e, convertPlaylistSongToSong(song))}
                    onTouchStart={(e) => handleTouchStart(e, convertPlaylistSongToSong(song))}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                  >

                    {/* Desktop Layout */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1">
                        <span className="group-hover:hidden text-gray-400 text-sm">
                          {index + 1}
                        </span>
                        <PlayIcon className="hidden group-hover:block w-4 h-4 text-white" />
                      </div>

                      <div className="col-span-5 flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded overflow-hidden">
                          {song.artwork_path ? (
                            <img
                              src={song.artwork_path}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PlayIconSolid className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-white font-medium text-sm truncate mb-1">
                            {song.title}
                          </h4>
                          <p className="text-gray-400 text-xs truncate">
                            {song.artist_name}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-3">
                        <p className="text-gray-400 text-sm truncate">
                          {song.album_title || 'Unknown Album'}
                        </p>
                      </div>

                      <div className="col-span-2 flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(song.song_id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                        >
                          {favorites.has(song.song_id) ? (
                            <HeartIconSolid className="w-4 h-4 text-red-400" />
                          ) : (
                            <HeartIcon className="w-4 h-4" />
                          )}
                        </button>

                        <span className="text-gray-400 text-sm">
                          {song.duration ? formatDuration(song.duration) : '--:--'}
                        </span>
                      </div>

                      <div className="col-span-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {songs.map((song, index) => (
                <div
                  key={`${song.song_id}-${song.position}`}
                  className="group relative bg-gray-800 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-gray-700 active:bg-gray-700"
                  onClick={(e) => handleClick(e, () => handlePlaySong(song, index))}
                  onContextMenu={(e) => handleContextMenu(e, convertPlaylistSongToSong(song))}
                  onTouchStart={(e) => handleTouchStart(e, convertPlaylistSongToSong(song))}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  <div className="flex items-center space-x-3">
                    {/* Track Number & Artwork */}
                    <div className="flex-shrink-0 relative">
                      {song.artwork_path ? (
                        <img
                          src={song.artwork_path}
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
                          handlePlaySong(song, index);
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                      </button>
                      {/* Track number */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center border border-gray-600">
                        <span className="text-gray-300 text-xs font-medium">{index + 1}</span>
                      </div>
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{song.title}</h3>
                      <p className="text-gray-400 text-sm truncate">
                        {song.artist_name || 'Unknown Artist'}
                        {song.album_title && ` • ${song.album_title}`}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <span>{song.duration ? formatDuration(song.duration) : '--:--'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(song.song_id);
                        }}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Toggle favorite"
                      >
                        {favorites.has(song.song_id) ? (
                          <HeartIconSolid className="w-5 h-5 text-red-400" />
                        ) : (
                          <HeartIcon className="w-5 h-5" />
                        )}
                      </button>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 md:py-12 bg-gray-800 rounded-lg">
            <PlayIconSolid className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3 md:mb-4" />
            <h3 className="text-lg md:text-xl font-bold text-white mb-2">This playlist is empty</h3>
            <p className="text-gray-400 mb-4 md:mb-6 text-sm md:text-base">Add some songs to get started!</p>
            {canEditPlaylist && (
              <button
                onClick={() => navigate('/search')}
                className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors mx-auto text-sm md:text-base"
              >
                <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
                Find Music
              </button>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        song={contextMenu.song}
        isAdmin={Boolean(user?.is_admin)}
        isFavorited={contextMenu.song ? favorites.has(contextMenu.song.id) : false}
        onPlay={() => contextMenu.song && handleContextMenuPlay(contextMenu.song)}
        onAddToQueue={() => contextMenu.song && handleContextMenuAddToQueue(contextMenu.song)}
        onAddToPlaylist={() => contextMenu.song && handleContextMenuAddToPlaylist(contextMenu.song)}
        onToggleFavorite={() => contextMenu.song && handleContextMenuToggleFavorite(contextMenu.song)}
        onShare={() => contextMenu.song && handleContextMenuShare(contextMenu.song)}
        onEdit={() => {}} // Not applicable for playlist songs
        onDelete={() => contextMenu.song && handleContextMenuRemove(contextMenu.song)}
      />

      {/* Edit Playlist Modal */}
      <EditPlaylistModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        playlist={playlist}
        onPlaylistUpdated={(updatedPlaylist) => {
          setPlaylist(updatedPlaylist);
          fetchPlaylistData(); // Refresh to get updated data
        }}
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

export default PlaylistDetailPage;