import React, { useEffect, useState, useCallback } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { usePlayerStore } from '../../stores/playerStore';
import apiService from '../../services/api';

const PlayerInfo: React.FC = () => {
  const { currentSong } = usePlayerStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkFavoriteStatus = useCallback(async () => {
    if (!currentSong?.id) return;
    
    try {
      const response = await apiService.checkFavoriteStatus(currentSong.id);
      setIsLiked(response.data.isFavorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  }, [currentSong?.id]);

  useEffect(() => {
    if (currentSong?.id) {
      checkFavoriteStatus();
    }
  }, [currentSong?.id, checkFavoriteStatus]);

  const handleToggleLike = async () => {
    if (!currentSong?.id || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.toggleFavorite(currentSong.id);
      setIsLiked(response.data.isFavorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 min-w-0">
      {/* Album artwork */}
      <div className="w-14 h-14 bg-gray-800 rounded-md flex-shrink-0 overflow-hidden">
        {currentSong?.artwork_path ? (
          <img
            src={apiService.getArtworkUrl(currentSong.artwork_path)}
            alt={`${currentSong.album_title} artwork`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Song details */}
      <div className="min-w-0 flex-1">
        <p className="text-white font-medium text-sm truncate">
          {currentSong ? currentSong.title : 'No song playing'}
        </p>
        <p className="text-gray-400 text-xs truncate">
          {currentSong ? (
            <>
              {currentSong.artist_name}
              {currentSong.album_title && (
                <>
                  <span className="mx-1">•</span>
                  {currentSong.album_title}
                </>
              )}
            </>
          ) : (
            'Select a song to start playing'
          )}
        </p>
      </div>

      {/* Like button - only show when song is playing */}
      {currentSong && (
        <button
          onClick={handleToggleLike}
          disabled={isLoading}
          className={`p-2 transition-colors ${
            isLoading 
              ? 'text-gray-500 cursor-not-allowed' 
              : 'text-gray-400 hover:text-white'
          }`}
          title={isLiked ? 'Remove from liked songs' : 'Add to liked songs'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : isLiked ? (
            <HeartIconSolid className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
};

export default PlayerInfo;