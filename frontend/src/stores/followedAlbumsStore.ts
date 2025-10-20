import { create } from 'zustand';
import { Album } from '../types';
import { apiService } from '../services/api';

interface FollowedAlbumsState {
  followedAlbums: Album[];
  isLoading: boolean;
  isFollowing: (albumId: number) => boolean;
  followAlbum: (album: Album) => Promise<void>;
  unfollowAlbum: (albumId: number) => Promise<void>;
  toggleFollow: (album: Album) => Promise<boolean>;
  loadFollowedAlbums: () => Promise<void>;
}

export const useFollowedAlbumsStore = create<FollowedAlbumsState>()((set, get) => ({
  followedAlbums: [],
  isLoading: false,

  isFollowing: (albumId: number) => {
    return get().followedAlbums.some(album => album.id === albumId);
  },

  loadFollowedAlbums: async () => {
    set({ isLoading: true });
    try {
      const response = await apiService.getFollowedAlbums();
      const albums = response?.data?.albums || [];
      set({ followedAlbums: albums, isLoading: false });
    } catch (error) {
      console.error('Failed to load followed albums:', error);
      set({ followedAlbums: [], isLoading: false });
    }
  },

  followAlbum: async (album: Album) => {
    try {
      await apiService.followAlbum(album.id);
      const { followedAlbums, isFollowing } = get();
      if (!isFollowing(album.id)) {
        set({ followedAlbums: [...followedAlbums, album] });
      }
    } catch (error) {
      console.error('Failed to follow album:', error);
      throw error;
    }
  },

  unfollowAlbum: async (albumId: number) => {
    try {
      await apiService.unfollowAlbum(albumId);
      const { followedAlbums } = get();
      set({ 
        followedAlbums: followedAlbums.filter(album => album.id !== albumId) 
      });
    } catch (error) {
      console.error('Failed to unfollow album:', error);
      throw error;
    }
  },

  toggleFollow: async (album: Album) => {
    try {
      const response = await apiService.toggleAlbumFollow(album.id);
      const { followedAlbums } = get();
      
      const isFollowing = response?.data?.isFollowing || false;
      
      if (isFollowing) {
        if (!get().isFollowing(album.id)) {
          set({ followedAlbums: [...followedAlbums, album] });
        }
      } else {
        set({ 
          followedAlbums: followedAlbums.filter(a => a.id !== album.id) 
        });
      }
      
      return isFollowing;
    } catch (error) {
      console.error('Failed to toggle album follow:', error);
      throw error;
    }
  },
}));