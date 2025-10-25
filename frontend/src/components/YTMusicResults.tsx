import {
  CloudArrowDownIcon,
  MusicalNoteIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiService } from '../services/api';

export interface YTMusicResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  thumbnail: string;
  isAvailableLocally: boolean;
  source: 'youtube-music';
}

interface DownloadState {
  [videoId: string]: {
    status: 'idle' | 'downloading' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
  };
}

interface YTMusicResultsProps {
  results: YTMusicResult[];
  onDownloadComplete?: () => void;
  initialDisplayCount?: number;
}

const YTMusicResults: React.FC<YTMusicResultsProps> = ({
  results,
  onDownloadComplete,
  initialDisplayCount = 5,
}) => {
  const { showSuccess, showError } = useToast();
  const [downloadStates, setDownloadStates] = useState<DownloadState>({});
  const [showAll, setShowAll] = useState(false);

  const handleDownload = async (result: YTMusicResult) => {
    try {
      setDownloadStates((prev) => ({
        ...prev,
        [result.id]: { status: 'downloading', progress: 0 },
      }));

      const response = await apiService.downloadYTMusicSong(result.id);
      const downloadId = response.data.downloadId;

      // Poll for download progress
      const pollProgress = async () => {
        try {
          const progressResponse =
            await apiService.getDownloadProgress(downloadId);
          const progressData = progressResponse.data;

          setDownloadStates((prev) => ({
            ...prev,
            [result.id]: {
              status:
                progressData.status === 'downloading' ||
                progressData.status === 'processing' ||
                progressData.status === 'completed' ||
                progressData.status === 'error'
                  ? progressData.status
                  : 'error',
              progress: progressData.progress,
              error: progressData.error,
            },
          }));

          if (progressData.status === 'completed') {
            showSuccess(
              `"${result.title}" has been downloaded and added to your library!`,
            );
            onDownloadComplete?.();
          } else if (progressData.status === 'error') {
            showError(
              `Failed to download "${result.title}": ${progressData.error}`,
            );
          } else if (
            progressData.status === 'downloading' ||
            progressData.status === 'processing'
          ) {
            // Continue polling more frequently (every 300ms instead of 1000ms)
            setTimeout(pollProgress, 300);
          }
        } catch (error) {
          console.error('Error polling download progress:', error);
          setDownloadStates((prev) => ({
            ...prev,
            [result.id]: {
              status: 'error',
              progress: 0,
              error: 'Failed to get progress',
            },
          }));
        }
      };

      // Start polling immediately (no delay)
      pollProgress();
    } catch (error) {
      console.error('Download error:', error);
      showError(`Failed to start download for "${result.title}"`);
      setDownloadStates((prev) => ({
        ...prev,
        [result.id]: { status: 'error', progress: 0, error: 'Download failed' },
      }));
    }
  };

  const formatDuration = (duration?: string): string => {
    if (!duration) return '';
    return duration;
  };

  const getDownloadButtonContent = (result: YTMusicResult) => {
    const downloadState = downloadStates[result.id];

    if (!downloadState || downloadState.status === 'idle') {
      return {
        icon: <CloudArrowDownIcon className="w-5 h-5" />,
        text: 'Download',
        disabled: false,
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
      };
    }

    switch (downloadState.status) {
      case 'downloading':
        return {
          icon: (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ),
          text: `${downloadState.progress}%`,
          disabled: true,
          className: 'bg-orange-600 text-white cursor-not-allowed',
        };
      case 'processing':
        return {
          icon: (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ),
          text: 'Processing...',
          disabled: true,
          className: 'bg-yellow-600 text-white cursor-not-allowed',
        };
      case 'completed':
        return {
          icon: <PlayIcon className="w-5 h-5" />,
          text: 'Available',
          disabled: true,
          className: 'bg-green-600 text-white cursor-not-allowed',
        };
      case 'error':
        return {
          icon: <CloudArrowDownIcon className="w-5 h-5" />,
          text: 'Retry',
          disabled: false,
          className: 'bg-red-600 hover:bg-red-700 text-white',
        };
      default:
        return {
          icon: <CloudArrowDownIcon className="w-5 h-5" />,
          text: 'Download',
          disabled: false,
          className: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  if (results.length === 0) {
    return null;
  }

  const displayedResults = showAll
    ? results
    : results.slice(0, initialDisplayCount);
  const hasMore = results.length > initialDisplayCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-400">
        <MusicalNoteIcon className="w-5 h-5" />
        <h3 className="text-lg font-semibold">YouTube Music</h3>
        <span className="text-sm text-gray-400">
          ({results.length} result{results.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
            <div className="col-span-1"></div>
            <div className="col-span-5">Title</div>
            <div className="col-span-3">Artist</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y divide-gray-700">
            {displayedResults.map((result) => {
              const downloadButton = getDownloadButtonContent(result);
              return (
                <div
                  key={result.id}
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-gray-700 transition-colors"
                >
                  <div className="col-span-1">
                    <div className="w-10 h-10 bg-gray-700 rounded overflow-hidden">
                      {result.thumbnail ? (
                        <img
                          src={result.thumbnail}
                          alt={result.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MusicalNoteIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-5">
                    <p className="text-white font-medium truncate">
                      {result.title}
                    </p>
                    {result.album && (
                      <p className="text-sm text-gray-400 truncate">
                        {result.album}
                      </p>
                    )}
                  </div>
                  <div className="col-span-3 text-gray-300">
                    {result.artist}
                  </div>
                  <div className="col-span-2 text-gray-300">
                    {formatDuration(result.duration)}
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => handleDownload(result)}
                      disabled={downloadButton.disabled}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        downloadButton.className,
                      )}
                    >
                      {downloadButton.icon}
                      <span className="hidden lg:inline">
                        {downloadButton.text}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Show All Button - Desktop */}
      {hasMore && (
        <div className="hidden md:flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            {showAll ? 'Show less' : `Show all ${results.length} results`}
          </button>
        </div>
      )}

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {displayedResults.map((result) => {
          const downloadButton = getDownloadButtonContent(result);
          return (
            <div key={result.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded overflow-hidden">
                  {result.thumbnail ? (
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicalNoteIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {result.title}
                  </h3>
                  <p className="text-gray-400 text-sm truncate">
                    {result.artist}
                    {result.album && ` • ${result.album}`}
                  </p>
                  {result.duration && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span>{formatDuration(result.duration)}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(result)}
                  disabled={downloadButton.disabled}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    downloadButton.className,
                  )}
                >
                  {downloadButton.icon}
                  <span>{downloadButton.text}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show All Button - Mobile */}
      {hasMore && (
        <div className="md:hidden flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors w-full"
          >
            {showAll ? 'Show less' : `Show all ${results.length} results`}
          </button>
        </div>
      )}
    </div>
  );
};

export default YTMusicResults;
