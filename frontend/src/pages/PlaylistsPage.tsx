import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PlayIcon,
  EllipsisHorizontalIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  ClockIcon,
  MusicalNoteIcon,
  UserIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { Playlist, Album } from '../types';
import { useFollowedPlaylistsStore } from '../stores/followedPlaylistsStore';
import { useFollowedAlbumsStore } from '../stores/followedAlbumsStore';
import toast from 'react-hot-toast';

interface PlaylistWithDetails extends Playlist {
  username: string;
  song_count: number;
  total_duration: number;
}

interface FollowedItem extends Album {
  type: 'album';
}

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; is_public: boolean }) => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Playlist name is required');
      return;
    }
    onCreate({ name: name.trim(), description: description.trim(), is_public: isPublic });
    setName('');
    setDescription('');
    setIsPublic(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Create Playlist</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playlist-name" className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              id="playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              placeholder="My Playlist"
              maxLength={255}
            />
          </div>

          <div>
            <label htmlFor="playlist-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="playlist-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="playlist-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-600 rounded bg-gray-700"
            />
            <label htmlFor="playlist-public" className="ml-2 text-sm text-gray-300">
              Make this playlist public
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-secondary transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: { name: string; description: string; is_public: boolean }) => void;
  playlist: PlaylistWithDetails | null;
}

const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({ isOpen, onClose, onUpdate, playlist }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
      setIsPublic(playlist.is_public);
    }
  }, [playlist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Playlist name is required');
      return;
    }
    onUpdate({ name: name.trim(), description: description.trim(), is_public: isPublic });
  };

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Edit Playlist</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-playlist-name" className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              id="edit-playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              maxLength={255}
            />
          </div>

          <div>
            <label htmlFor="edit-playlist-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="edit-playlist-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit-playlist-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-600 rounded bg-gray-700"
            />
            <label htmlFor="edit-playlist-public" className="ml-2 text-sm text-gray-300">
              Make this playlist public
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-secondary transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlaylistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'my' | 'public' | 'all' | 'followed'>('all');
  const { followedPlaylists, loadFollowedPlaylists } = useFollowedPlaylistsStore();
  const { followedAlbums, loadFollowedAlbums } = useFollowedAlbumsStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistWithDetails | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    playlist: PlaylistWithDetails | null;
  }>({ show: false, x: 0, y: 0, playlist: null });

  useEffect(() => {
    loadPlaylists();
    // Refresh followed data when navigating to playlists page
    loadFollowedPlaylists();
    loadFollowedAlbums();
  }, [viewMode, loadFollowedPlaylists, loadFollowedAlbums]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      let response;
      
      if (viewMode === 'followed') {
        // For followed view, we don't load playlists here as they're handled by the stores
        setPlaylists([]);
        return;
      }
      
      if (searchQuery.trim()) {
        response = await apiService.searchPlaylists(searchQuery);
      } else {
        switch (viewMode) {
          case 'my':
            response = await apiService.getUserPlaylists();
            break;
          case 'public':
            response = await apiService.getPublicPlaylists();
            break;
          case 'all':
            // For 'all' view, combine public playlists with user's own playlists
            const [publicResponse, userResponse] = await Promise.all([
              apiService.getPublicPlaylists(),
              apiService.getUserPlaylists()
            ]);
            
            if (publicResponse.success && userResponse.success) {
              const combinedPlaylists = [
                ...(publicResponse.data?.playlists || []),
                ...(userResponse.data?.playlists || [])
              ];
              
              // Remove duplicates (in case user's playlists are also public)
              const uniquePlaylists = combinedPlaylists.filter((playlist, index, arr) => 
                arr.findIndex(p => p.id === playlist.id) === index
              );
              
              response = {
                success: true,
                data: { playlists: uniquePlaylists }
              };
            } else {
              response = publicResponse.success ? publicResponse : userResponse;
            }
            break;
          default:
            response = await apiService.getUserPlaylists();
        }
      }

      if (response.success && response.data) {
        setPlaylists(response.data.playlists || []);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (data: { name: string; description: string; is_public: boolean }) => {
    try {
      const response = await apiService.createPlaylist(data);
      if (response.success) {
        toast.success('Playlist created successfully');
        setIsCreateModalOpen(false);
        loadPlaylists();
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      toast.error('Failed to create playlist');
    }
  };

  const handleUpdatePlaylist = async (data: { name: string; description: string; is_public: boolean }) => {
    if (!editingPlaylist) return;

    try {
      const response = await apiService.updatePlaylist(editingPlaylist.id, data);
      if (response.success) {
        toast.success('Playlist updated successfully');
        setIsEditModalOpen(false);
        setEditingPlaylist(null);
        loadPlaylists();
      }
    } catch (error) {
      console.error('Failed to update playlist:', error);
      toast.error('Failed to update playlist');
    }
  };

  const handleDeletePlaylist = async (playlist: PlaylistWithDetails) => {
    if (!window.confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiService.deletePlaylist(playlist.id);
      if (response.success) {
        toast.success('Playlist deleted successfully');
        loadPlaylists();
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const handleShare = async (playlist: PlaylistWithDetails) => {
    try {
      const url = `${window.location.origin}/playlists/${playlist.id}`;
      await navigator.clipboard.writeText(url);
      toast.success('Playlist link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, playlist: PlaylistWithDetails) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      playlist
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, playlist: null });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (playlist.description && playlist.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    playlist.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFollowedPlaylists = followedPlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (playlist.description && playlist.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFollowedAlbums = followedAlbums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (album.artist_name && album.artist_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Playlists</h1>
          <p className="text-gray-400">Your curated music collections</p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-3 py-2 rounded-lg transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Create Playlist
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPlaylists()}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
          />
        </div>

        {/* View Mode Selector */}
        <div className="flex bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mx-auto sm:mx-0">
          <button
            onClick={() => setViewMode('my')}
            className={`px-3 py-2 text-sm transition-colors ${
              viewMode === 'my'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Playlists
          </button>
          <button
            onClick={() => setViewMode('followed')}
            className={`px-3 py-2 text-sm transition-colors border-l border-gray-700 ${
              viewMode === 'followed'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Followed
          </button>
          <button
            onClick={() => setViewMode('public')}
            className={`px-3 py-2 text-sm transition-colors border-l border-gray-700 ${
              viewMode === 'public'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-2 text-sm transition-colors border-l border-gray-700 ${
              viewMode === 'all'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Playlists List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'followed' ? (
        // Followed items view
        filteredFollowedPlaylists.length === 0 && filteredFollowedAlbums.length === 0 ? (
          <div className="text-center py-12">
            <MusicalNoteIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {searchQuery ? 'No followed items found' : 'No followed items yet'}
            </p>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'Follow some playlists and albums to see them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFollowedPlaylists.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Followed Playlists</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {filteredFollowedPlaylists.map((playlist, index) => (
                    <div
                      key={`playlist-${playlist.id}`}
                      className={`flex items-center p-4 hover:bg-gray-700 transition-colors cursor-pointer ${
                        index > 0 ? 'border-t border-gray-700' : ''
                      }`}
                      onClick={() => navigate(`/playlist/${playlist.id}`)}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-md flex items-center justify-center flex-shrink-0 mr-4">
                        <MusicalNoteIcon className="w-6 h-6 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Playlist</span>
                        </div>
                        {playlist.description && (
                          <p className="text-xs text-gray-500 truncate" title={playlist.description}>
                            {playlist.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {filteredFollowedAlbums.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Followed Albums</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {filteredFollowedAlbums.map((album, index) => (
                    <div
                      key={`album-${album.id}`}
                      className={`flex items-center p-4 hover:bg-gray-700 transition-colors cursor-pointer ${
                        index > 0 ? 'border-t border-gray-700' : ''
                      }`}
                      onClick={() => navigate(`/album/${album.id}`)}
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 mr-4">
                        {album.artwork_path ? (
                          <img
                            src={apiService.getArtworkUrl(album.artwork_path)}
                            alt={album.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                            <MusicalNoteIcon className="w-6 h-6 text-white/80" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{album.title}</h3>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Album</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{album.artist_name}</p>
                        {album.release_year && (
                          <p className="text-xs text-gray-500">{album.release_year}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        // Regular playlists view
        filteredPlaylists.length === 0 && (viewMode !== 'all' || filteredFollowedAlbums.length === 0) ? (
          <div className="text-center py-12">
            <MusicalNoteIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {searchQuery ? 'No items found' : viewMode === 'all' ? 'No playlists or albums yet' : 'No playlists yet'}
            </p>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'Create your first playlist to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Playlists Section */}
            {filteredPlaylists.length > 0 && (
              <div>
                {viewMode === 'all' && <h2 className="text-xl font-semibold text-white mb-4">All Playlists</h2>}
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {filteredPlaylists.map((playlist, index) => (
                    <div
                      key={playlist.id}
                      className={`flex items-center p-4 hover:bg-gray-700 transition-colors cursor-pointer ${
                        index > 0 ? 'border-t border-gray-700' : ''
                      }`}
                      onClick={() => navigate(`/playlist/${playlist.id}`)}
                      onContextMenu={(e) => handleContextMenu(e, playlist)}
                    >
                      {/* Playlist Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-md flex items-center justify-center flex-shrink-0 mr-4">
                        {playlist.song_count > 0 ? (
                          <MusicalNoteIcon className="w-6 h-6 text-white/80" />
                        ) : (
                          <PlusIcon className="w-5 h-5 text-white/60" />
                        )}
                      </div>

                      {/* Playlist Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                          {playlist.is_public ? (
                            <GlobeAltIcon className="w-4 h-4 text-green-400 flex-shrink-0" title="Public playlist" />
                          ) : (
                            <LockClosedIcon className="w-4 h-4 text-gray-400 flex-shrink-0" title="Private playlist" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {playlist.username}
                          </span>
                          <span className="flex items-center gap-1">
                            <MusicalNoteIcon className="w-3 h-3" />
                            {playlist.song_count} songs
                          </span>
                          {playlist.total_duration > 0 && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {formatDuration(playlist.total_duration)}
                            </span>
                          )}
                        </div>
                        
                        {playlist.description && (
                          <p className="text-xs text-gray-500 truncate mt-1" title={playlist.description}>
                            {playlist.description}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, playlist);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Followed Albums Section (only show in 'all' view) */}
            {viewMode === 'all' && filteredFollowedAlbums.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Your Followed Albums</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {filteredFollowedAlbums.map((album, index) => (
                    <div
                      key={`album-${album.id}`}
                      className={`flex items-center p-4 hover:bg-gray-700 transition-colors cursor-pointer ${
                        index > 0 ? 'border-t border-gray-700' : ''
                      }`}
                      onClick={() => navigate(`/album/${album.id}`)}
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 mr-4">
                        {album.artwork_path ? (
                          <img
                            src={apiService.getArtworkUrl(album.artwork_path)}
                            alt={album.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                            <MusicalNoteIcon className="w-6 h-6 text-white/80" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{album.title}</h3>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Album</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{album.artist_name}</p>
                        {album.release_year && (
                          <p className="text-xs text-gray-500">{album.release_year}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Context Menu */}
      {contextMenu.show && contextMenu.playlist && (
        <div
          className="fixed z-50 min-w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
          }}
          onMouseLeave={closeContextMenu}
        >
          <button
            onClick={() => {
              navigate(`/playlist/${contextMenu.playlist!.id}`);
              closeContextMenu();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 w-full text-left"
          >
            <PlayIcon className="w-4 h-4" />
            Open Playlist
          </button>
          <button
            onClick={() => {
              handleShare(contextMenu.playlist!);
              closeContextMenu();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 w-full text-left"
          >
            <ShareIcon className="w-4 h-4" />
            Share Playlist
          </button>
          <button
            onClick={() => {
              setEditingPlaylist(contextMenu.playlist);
              setIsEditModalOpen(true);
              closeContextMenu();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 w-full text-left"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Playlist
          </button>
          <button
            onClick={() => {
              handleDeletePlaylist(contextMenu.playlist!);
              closeContextMenu();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 w-full text-left"
          >
            <TrashIcon className="w-4 h-4" />
            Delete Playlist
          </button>
        </div>
      )}

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      <EditPlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPlaylist(null);
        }}
        onUpdate={handleUpdatePlaylist}
        playlist={editingPlaylist}
      />
    </div>
  );
};

export default PlaylistsPage;