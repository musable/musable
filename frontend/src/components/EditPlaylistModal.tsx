import React, { useState, useEffect } from 'react';
import { Playlist } from '../types';
import apiService from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onPlaylistUpdated: (playlist: Playlist) => void;
}

const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  isOpen,
  onClose,
  playlist,
  onPlaylistUpdated
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
      setIsPublic(playlist.is_public);
    }
  }, [playlist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlist || !name.trim()) {
      showError('Playlist name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.updatePlaylist(playlist.id, {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic
      });

      onPlaylistUpdated(response.data.playlist);
      showSuccess('Playlist updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating playlist:', error);
      showError('Failed to update playlist');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Edit Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-playlist-name" className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name *
            </label>
            <input
              type="text"
              id="edit-playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary"
              placeholder="Enter playlist name"
              required
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
              placeholder="Describe your playlist..."
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
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary hover:bg-secondary text-white rounded-md font-medium transition-colors disabled:opacity-50"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Updating...' : 'Update Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlaylistModal;