import { create } from 'zustand';
import { Playlist } from '../types';
import { apiService } from '../services/api';

interface FollowedPlaylistsState {
  followedPlaylists: Playlist[];
  isLoading: boolean;
  isFollowing: (playlistId: number) => boolean;
  followPlaylist: (playlist: Playlist) => Promise<void>;
  unfollowPlaylist: (playlistId: number) => Promise<void>;
  toggleFollow: (playlist: Playlist) => Promise<boolean>;
  loadFollowedPlaylists: () => Promise<void>;
}

export const useFollowedPlaylistsStore = create<FollowedPlaylistsState>()((set, get) => ({
  followedPlaylists: [],
  isLoading: false,

  isFollowing: (playlistId: number) => {
    return get().followedPlaylists.some(playlist => playlist.id === playlistId);
  },

  loadFollowedPlaylists: async () => {
    set({ isLoading: true });
    try {
      const response = await apiService.getFollowedPlaylists();
      const playlists = response?.data?.playlists || [];
      set({ followedPlaylists: playlists, isLoading: false });
    } catch (error) {
      console.error('Failed to load followed playlists:', error);
      set({ followedPlaylists: [], isLoading: false });
    }
  },

  followPlaylist: async (playlist: Playlist) => {
    try {
      await apiService.followPlaylist(playlist.id);
      const { followedPlaylists, isFollowing } = get();
      if (!isFollowing(playlist.id)) {
        set({ followedPlaylists: [...followedPlaylists, playlist] });
      }
    } catch (error) {
      console.error('Failed to follow playlist:', error);
      throw error;
    }
  },

  unfollowPlaylist: async (playlistId: number) => {
    try {
      await apiService.unfollowPlaylist(playlistId);
      const { followedPlaylists } = get();
      set({ 
        followedPlaylists: followedPlaylists.filter(playlist => playlist.id !== playlistId) 
      });
    } catch (error) {
      console.error('Failed to unfollow playlist:', error);
      throw error;
    }
  },

  toggleFollow: async (playlist: Playlist) => {
    try {
      const response = await apiService.togglePlaylistFollow(playlist.id);
      const { followedPlaylists } = get();
      
      const isFollowing = response?.data?.isFollowing || false;
      
      if (isFollowing) {
        if (!get().isFollowing(playlist.id)) {
          set({ followedPlaylists: [...followedPlaylists, playlist] });
        }
      } else {
        set({ 
          followedPlaylists: followedPlaylists.filter(p => p.id !== playlist.id) 
        });
      }
      
      return isFollowing;
    } catch (error) {
      console.error('Failed to toggle playlist follow:', error);
      throw error;
    }
  },
}));