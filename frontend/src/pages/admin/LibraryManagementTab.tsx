import React, { useEffect, useState } from 'react';
import {
  MusicalNoteIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { Song, ScanProgress } from '../../types';
import clsx from 'clsx';

interface LibraryPath {
  id: number;
  path: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const LibraryManagementTab: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [libraryPaths, setLibraryPaths] = useState<LibraryPath[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPath, setNewPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSongs, setTotalSongs] = useState(0);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const songsPerPage = 50;

  useEffect(() => {
    fetchLibraryData();
    fetchScanStatus();
    
    const interval = setInterval(() => {
      if (scanStatus?.status === 'running') {
        fetchScanStatus();
        // Don't fetch songs during scanning to avoid flickering
      }
    }, 1000); // Reduced to 1 second for better real-time feel

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStatus?.status]);

  useEffect(() => {
    // Reset to page 1 when search query changes
    if (currentPage !== 1) {
      setCurrentPage(1);
      return; // Let the currentPage effect handle the API call
    }
    
    // Debounced search effect
    const timeoutId = setTimeout(() => {
      fetchSongs(currentPage, searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentPage]);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const pathsResponse = await apiService.getLibraryPaths();
      setLibraryPaths(pathsResponse.data.paths);
      await fetchSongs();
    } catch (err: any) {
      console.error('Failed to fetch library data:', err);
      setError(err.message || 'Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSongs = async (page: number = 1, search: string = '') => {
    try {
      setLoadingSongs(true);
      const offset = (page - 1) * songsPerPage;
      const songsResponse = await apiService.getSongs({ 
        limit: songsPerPage, 
        offset,
        search: search || undefined
      });
      setSongs(songsResponse.data.songs);
      setTotalSongs(songsResponse.data.total);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Failed to fetch songs:', err);
      setError(err.message || 'Failed to load songs');
    } finally {
      setLoadingSongs(false);
    }
  };

  const fetchScanStatus = async () => {
    try {
      const response = await apiService.getScanStatus();
      const newScanStatus = response.data.currentScan;
      
      // Check if scan just completed
      if (scanStatus?.status === 'running' && (!newScanStatus || newScanStatus.status !== 'running')) {
        // Scan completed, refresh songs list
        await fetchSongs(currentPage, searchQuery);
      }
      
      setScanStatus(newScanStatus);
    } catch (err: any) {
      console.error('Failed to fetch scan status:', err);
    }
  };

  const handleStartScan = async (paths?: string[]) => {
    try {
      await apiService.startLibraryScan(paths);
      await fetchScanStatus();
      // Reset to first page when starting a scan
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    } catch (err: any) {
      console.error('Failed to start library scan:', err);
      setError(err.message || 'Failed to start library scan');
    }
  };

  const handleAddPath = async () => {
    if (newPath.trim()) {
      try {
        await apiService.addLibraryPath(newPath.trim());
        setNewPath('');
        // Only refresh library paths, not songs
        const pathsResponse = await apiService.getLibraryPaths();
        setLibraryPaths(pathsResponse.data.paths);
        setError(null);
      } catch (err: any) {
        console.error('Failed to add library path:', err);
        setError(err.message || 'Failed to add library path');
      }
    }
  };

  const handleRemovePath = async (id: number) => {
    try {
      await apiService.deleteLibraryPath(id);
      // Only refresh library paths, not songs
      const pathsResponse = await apiService.getLibraryPaths();
      setLibraryPaths(pathsResponse.data.paths);
      setError(null);
    } catch (err: any) {
      console.error('Failed to delete library path:', err);
      setError(err.message || 'Failed to delete library path');
    }
  };

  const handleTogglePath = async (id: number) => {
    try {
      const path = libraryPaths.find(p => p.id === id);
      if (path) {
        await apiService.updateLibraryPath(id, { is_active: !path.is_active });
        // Only refresh library paths, not songs
        const pathsResponse = await apiService.getLibraryPaths();
        setLibraryPaths(pathsResponse.data.paths);
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to update library path:', err);
      setError(err.message || 'Failed to update library path');
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!window.confirm('Are you sure you want to delete this song? This will remove it from the database but not delete the file.')) {
      return;
    }

    try {
      await apiService.deleteSong(songId);
      await fetchSongs(currentPage, searchQuery);
    } catch (err: any) {
      console.error('Failed to delete song:', err);
      setError(err.message || 'Failed to delete song');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalSongs / songsPerPage);
  const startIndex = (currentPage - 1) * songsPerPage + 1;
  const endIndex = Math.min(currentPage * songsPerPage, totalSongs);

  // Remove filteredSongs since we're now handling search server-side

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Library Management</h2>
        <p className="text-gray-400">Manage music library paths and scan for new content</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Library Paths Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <FolderIcon className="w-5 h-5 mr-2" />
            Library Paths
          </h3>
          <button
            onClick={() => handleStartScan()}
            disabled={scanStatus?.status === 'running'}
            className={clsx(
              'flex items-center px-4 py-2 rounded-lg transition-colors',
              scanStatus?.status === 'running'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            <ArrowPathIcon className={clsx('w-4 h-4 mr-2', scanStatus?.status === 'running' && 'animate-spin')} />
            {scanStatus?.status === 'running' ? 'Scanning...' : 'Scan Library'}
          </button>
        </div>

        {/* Add new path */}
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="Enter library path (e.g., /home/user/Music)"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyPress={(e) => e.key === 'Enter' && handleAddPath()}
          />
          <button
            onClick={handleAddPath}
            disabled={!newPath.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scan Progress */}
        {scanStatus?.status === 'running' && (
          <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
            <div className="flex items-center mb-3">
              <ArrowPathIcon className="w-5 h-5 text-yellow-400 animate-spin mr-2" />
              <span className="text-yellow-400 font-medium">Scanning Library...</span>
              {scanStatus.progress !== undefined && (
                <span className="ml-auto text-yellow-400 font-semibold">
                  {scanStatus.progress}%
                </span>
              )}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
              <div 
                className="bg-yellow-400 h-3 rounded-full transition-all duration-500 ease-in-out" 
                style={{ 
                  width: `${scanStatus.progress || 0}%`,
                  minWidth: scanStatus.progress && scanStatus.progress > 0 ? '8px' : '0'
                }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-300 font-medium">{scanStatus.filesScanned}</div>
                <div className="text-gray-400 text-xs">Scanned</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-medium">{scanStatus.filesAdded}</div>
                <div className="text-gray-400 text-xs">Added</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-medium">{scanStatus.filesUpdated}</div>
                <div className="text-gray-400 text-xs">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-medium">{scanStatus.errorsCount}</div>
                <div className="text-gray-400 text-xs">Errors</div>
              </div>
            </div>
            {scanStatus.totalFiles && (
              <p className="text-gray-400 text-xs mt-2 text-center">
                Processing {scanStatus.filesScanned} of {scanStatus.totalFiles} files
              </p>
            )}
            {scanStatus.currentFile && (
              <p className="text-gray-400 text-xs mt-1 text-center truncate">
                Current: {scanStatus.currentFile}
              </p>
            )}
          </div>
        )}

        {/* Paths list */}
        <div className="space-y-2">
          {libraryPaths.map((path) => (
            <div key={path.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  checked={path.is_active}
                  onChange={() => handleTogglePath(path.id)}
                  className="w-4 h-4 text-primary bg-gray-600 border-gray-500 rounded focus:ring-primary focus:ring-2"
                />
                <div className="ml-3 flex-1">
                  <p className={clsx(
                    'font-medium',
                    path.is_active ? 'text-white' : 'text-gray-400'
                  )}>
                    {path.path}
                  </p>
                  {path.updated_at && (
                    <p className="text-gray-400 text-sm">
                      Last updated: {new Date(path.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemovePath(path.id)}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                title="Remove path"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {libraryPaths.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            No library paths configured. Add a path to start scanning for music.
          </p>
        )}
      </div>

      {/* Library Overview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <MusicalNoteIcon className="w-5 h-5 mr-2" />
          Library Overview ({totalSongs.toLocaleString()} songs)
        </h3>

        {/* Search */}
        <div className="mb-4 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {loadingSongs && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Songs table */}
        {songs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Artist</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Album</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <tr key={song.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {song.artwork_path ? (
                          <img 
                            src={song.artwork_path} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center mr-3">
                            <MusicalNoteIcon className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{song.title}</p>
                          {song.genre && (
                            <p className="text-gray-400 text-sm">{song.genre}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{song.artist_name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-gray-300">{song.album_title || 'Unknown'}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400 text-sm">Available</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSong(song.id!)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Remove from library"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {startIndex.toLocaleString()} to {endIndex.toLocaleString()} of {totalSongs.toLocaleString()} songs
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loadingSongs}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {/* Show page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber = Math.max(1, currentPage - 2) + i;
                      if (pageNumber > totalPages) return null;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          disabled={loadingSongs}
                          className={clsx(
                            'px-3 py-2 rounded-lg transition-colors',
                            pageNumber === currentPage
                              ? 'bg-primary text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          )}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    {totalPages > currentPage + 2 && (
                      <span className="px-2 py-2 text-gray-400">...</span>
                    )}
                    
                    {totalPages > currentPage + 2 && (
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={loadingSongs}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loadingSongs}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            {loadingSongs ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-gray-400">Loading songs...</span>
              </div>
            ) : searchQuery ? (
              <p className="text-gray-400">No songs found matching "{searchQuery}"</p>
            ) : (
              <div>
                <MusicalNoteIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No songs in library</p>
                <p className="text-gray-500 text-sm">Add library paths and scan to populate your music collection</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryManagementTab;