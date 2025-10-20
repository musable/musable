import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayIcon, MusicalNoteIcon, ClockIcon, CalendarIcon, HeartIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid, PauseIcon, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { usePlayerStore } from '../stores/playerStore';
import { useFollowedAlbumsStore } from '../stores/followedAlbumsStore';
import { useRoomStore } from '../stores/roomStore';
import { handleRoomAwarePlayback } from '../utils/roomPlayback';
import { useToast } from '../contexts/ToastContext';
import { apiService } from '../services/api';
import { Album, Song } from '../types';
import clsx from 'clsx';

const AlbumPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { play, setQueue, currentSong, isPlaying } = usePlayerStore();
  const { isFollowing, toggleFollow, loadFollowedAlbums } = useFollowedAlbumsStore();
  const roomStore = useRoomStore();
  const { showSuccess } = useToast();
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const fetchAlbum = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiService.getAlbum(Number(id));
        
        if (response.success) {
          setAlbum(response.data.album);
          setSongs(response.data.songs);
        } else {
          setError('Failed to load album');
        }
      } catch (error) {
        console.error('Error fetching album:', error);
        setError('Failed to load album');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
    loadFollowedAlbums();
  }, [id, navigate, loadFollowedAlbums]);

  const handlePlayAlbum = () => {
    if (songs.length > 0) {
      handleRoomAwarePlayback(songs[0], songs);
    }
  };

  const handlePlaySong = (song: Song, index: number) => {
    handleRoomAwarePlayback(song, songs);
  };

  const handleToggleFollow = async () => {
    if (album) {
      try {
        const isNowFollowing = await toggleFollow(album);
        showSuccess(isNowFollowing ? 'Album followed!' : 'Album unfollowed!');
      } catch (error) {
        console.error('Failed to toggle album follow:', error);
      }
    }
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const totalDuration = songs.reduce((acc, song) => acc + (song.duration || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="text-center py-24">
        <MusicalNoteIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Album not found</h3>
        <p className="text-gray-400 mb-6">{error || 'The album you\'re looking for doesn\'t exist.'}</p>
        <button
          onClick={() => navigate('/search')}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8">
      {/* Album Header */}
      <div className="px-4 md:px-0">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 md:gap-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/library')}
            className="lg:hidden flex items-center text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Library
          </button>

          {/* Album Artwork */}
          <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 mx-auto lg:mx-0 flex-shrink-0">
          <div className="w-full h-full rounded-lg overflow-hidden bg-gray-800 shadow-2xl">
            {album.artwork_path ? (
              <img
                src={apiService.getArtworkUrl(album.artwork_path)}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MusicalNoteIcon className="w-16 h-16 md:w-20 md:h-20 text-gray-400" />
              </div>
            )}
          </div>
        </div>

          {/* Album Info */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-xs md:text-sm uppercase text-gray-400 tracking-wider mb-1 md:mb-2">Album</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2 md:mb-4 leading-tight break-words">
              {album.title}
            </h1>
            <div className="mb-4 md:mb-6">
              <button
                onClick={() => navigate(`/artist/${album.artist_id}`)}
                className="text-sm md:text-lg font-semibold text-gray-300 hover:text-white hover:underline transition-colors block text-center lg:text-left mb-2"
              >
                {album.artist_name}
              </button>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 md:gap-4 text-xs md:text-sm text-gray-400">
                {album.release_year && (
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 md:w-4 md:h-4" />
                    <span>{album.release_year}</span>
                  </div>
                )}
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <MusicalNoteIcon className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
                </div>
                {totalDuration > 0 && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{formatTotalDuration(totalDuration)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                onClick={handlePlayAlbum}
                disabled={songs.length === 0}
                className={clsx(
                  'flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full text-black font-semibold transition-all text-sm md:text-base',
                  songs.length > 0
                    ? 'bg-primary hover:bg-secondary hover:scale-105'
                    : 'bg-gray-600 cursor-not-allowed'
                )}
              >
                <PlayIconSolid className="w-4 h-4 md:w-5 md:h-5" />
                <span>Play Album</span>
              </button>

              <button
                onClick={handleToggleFollow}
                className={clsx(
                  'flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-full border-2 transition-all text-sm md:text-base',
                  isFollowing(album?.id || 0)
                    ? 'border-primary text-primary hover:bg-primary hover:text-black'
                    : 'border-gray-400 text-gray-400 hover:border-white hover:text-white'
                )}
                title={isFollowing(album?.id || 0) ? 'Unfollow Album' : 'Follow Album'}
              >
                {isFollowing(album?.id || 0) ? (
                  <HeartIconSolid className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <HeartIcon className="w-4 h-4 md:w-5 md:h-5" />
                )}
                <span className="font-medium hidden sm:inline">
                  {isFollowing(album?.id || 0) ? 'Following' : 'Follow'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Back Button */}
      <div className="px-4 md:px-0">
        <button
          onClick={() => navigate('/library')}
          className="hidden lg:flex items-center text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Library
        </button>
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-0">
        {songs.length > 0 ? (
          <>
            {/* Desktop List View */}
            <div className="hidden md:block bg-gray-900/50 rounded-lg p-6">
              <div className="space-y-2">
                {songs.map((song, index) => {
                  const isCurrentSong = currentSong?.id === song.id;
                  const isSongPlaying = isCurrentSong && isPlaying;

                  return (
                    <div
                      key={song.id}
                      className={clsx(
                        'flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer',
                        isCurrentSong && 'bg-gray-800'
                      )}
                      onClick={() => handlePlaySong(song, index)}
                    >
                      {/* Track Number / Play Button */}
                      <div className="w-8 h-8 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                        {isSongPlaying ? (
                          <PauseIcon className="w-4 h-4 text-primary" />
                        ) : isCurrentSong ? (
                          <PlayIcon className="w-4 h-4 text-primary" />
                        ) : (
                          <>
                            <span className="group-hover:hidden text-sm">
                              {song.track_number || index + 1}
                            </span>
                            <PlayIcon className="w-4 h-4 hidden group-hover:block" />
                          </>
                        )}
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={clsx(
                          'font-medium truncate',
                          isCurrentSong ? 'text-primary' : 'text-white'
                        )}>
                          {song.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">
                          {song.artist_name}
                        </p>
                      </div>

                      {/* Duration */}
                      <div className="text-gray-400 text-sm">
                        {song.duration ? formatDuration(song.duration) : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {songs.map((song, index) => {
                const isCurrentSong = currentSong?.id === song.id;
                const isSongPlaying = isCurrentSong && isPlaying;

                return (
                  <div
                    key={song.id}
                    className={clsx(
                      'group relative bg-gray-800 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-gray-700 active:bg-gray-700',
                      isCurrentSong && 'bg-red-500 bg-opacity-20 border-l-4 border-red-500'
                    )}
                    onClick={() => handlePlaySong(song, index)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Track Number & Artwork */}
                      <div className="flex-shrink-0 relative">
                        {album.artwork_path ? (
                          <img
                            src={apiService.getArtworkUrl(album.artwork_path)}
                            alt={album.title || 'Album artwork'}
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
                          {isSongPlaying ? (
                            <PauseIcon className="w-5 h-5 text-white" />
                          ) : (
                            <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                          )}
                        </button>
                        {/* Track number */}
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center border border-gray-600">
                          <span className="text-gray-300 text-xs font-medium">{song.track_number || index + 1}</span>
                        </div>
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={clsx(
                          'font-medium truncate',
                          isCurrentSong ? 'text-primary' : 'text-white'
                        )}>
                          {song.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">
                          {song.artist_name || 'Unknown Artist'}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span>{song.duration ? formatDuration(song.duration) : '--:--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 md:py-12 bg-gray-800 rounded-lg">
            <MusicalNoteIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3 md:mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No songs found</h3>
            <p className="text-gray-400 text-sm md:text-base">This album doesn't have any songs.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumPage;