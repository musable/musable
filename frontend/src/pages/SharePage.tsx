import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Song } from '../types';
import { MusicalNoteIcon, PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { Howl } from 'howler';
import { getBaseUrl, getApiBaseUrl } from '../config/config';
import apiService from '../services/api';

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [howl, setHowl] = useState<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const fetchSharedSong = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/share/${token}`);
        if (!response.ok) {
          throw new Error('Song not found or sharing not enabled');
        }
        const data = await response.json();
        setSong(data.song);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load song');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedSong();
    }
  }, [token]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (!song) return;

    if (howl) {
      if (isPlaying) {
        howl.pause();
      } else {
        howl.play();
      }
    } else {
      const streamUrl = apiService.getStreamUrl(song.id);
      const newHowl = new Howl({
        src: [streamUrl],
        html5: true,
        preload: true,
        format: ['mp3'],
        volume: isMuted ? 0 : volume,
        onload: () => {
          setDuration(newHowl.duration());
        },
        onplay: () => {
          setIsPlaying(true);
        },
        onpause: () => {
          setIsPlaying(false);
        },
        onend: () => {
          setIsPlaying(false);
          setCurrentTime(0);
        },
        onloaderror: (id: number, error: any) => {
          console.error('Audio load error:', error);
          setError('Failed to load audio');
        },
      });
      
      setHowl(newHowl);
      newHowl.play();
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!howl || !duration) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    howl.seek(newTime);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (howl && !isMuted) {
      howl.volume(newVolume);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (howl) {
      howl.volume(newMuted ? 0 : volume);
    }
  };

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      if (howl && isPlaying) {
        const time = howl.seek() as number;
        if (typeof time === 'number' && !isNaN(time)) {
          setCurrentTime(time);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [howl, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (howl) {
        howl.unload();
      }
    };
  }, [howl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Oops!</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Song not found</h1>
          <p className="text-gray-400">The song you're looking for doesn't exist or is no longer shared.</p>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Album Art */}
        <div className="aspect-square bg-gray-700 flex items-center justify-center">
          {song.artwork_path ? (
            <img
              src={apiService.getArtworkUrl(song.artwork_path)}
              alt={song.album_title || 'Album artwork'}
              className="w-full h-full object-cover"
            />
          ) : (
            <MusicalNoteIcon className="w-24 h-24 text-gray-400" />
          )}
        </div>

        {/* Song Info */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">{song.title}</h1>
          <p className="text-gray-400 text-center mb-1">{song.artist_name}</p>
          {song.album_title && (
            <p className="text-gray-500 text-sm text-center mb-6">{song.album_title}</p>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div 
              className="w-full h-2 bg-gray-700 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={handlePlay}
              className="w-16 h-16 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? (
                <PauseIcon className="w-8 h-8" />
              ) : (
                <PlayIcon className="w-8 h-8 ml-1" />
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white">
              {isMuted || volume === 0 ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer volume-slider"
              style={{ '--volume': `${volume * 100}%` } as React.CSSProperties}
            />
          </div>

          {/* Branding */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">Shared via Musable</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePage;