import { apiService } from './api';

export interface SearchImage {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
  videoId?: string;
  channelTitle?: string;
}

class ImageSearchService {
  
  // Search images from YouTube thumbnails via secure backend API
  async searchImages(query: string, limit = 20): Promise<SearchImage[]> {
    try {
      console.log(`🔍 Searching for images via backend: "${query}" (limit: ${limit})`);
      
      const response = await apiService.searchYouTubeImages(query, limit);
      
      if (response.success && response.data) {
        console.log(`✅ Found ${response.data.data.length} results from backend`);
        return response.data.data;
      } else {
        console.warn('Backend search returned no results, using fallback');
        return this.getFallbackImages(query, limit);
      }
    } catch (error) {
      console.error('Backend search failed:', error);
      // Fallback to local mock data
      return this.getFallbackImages(query, limit);
    }
  }
  
  // Fetch album artwork specifically for music using backend API
  async searchAlbumArtwork(artist: string, album: string): Promise<SearchImage[]> {
    try {
      console.log(`🎨 Searching for album artwork via backend: "${artist}" - "${album}"`);
      
      const response = await apiService.searchYouTubeAlbumArtwork(artist, album);
      
      if (response.success && response.data) {
        console.log(`✅ Found ${response.data.data.length} album artwork results from backend`);
        return response.data.data;
      } else {
        console.warn('Backend album artwork search returned no results, fallback to regular search');
        // Fallback to regular search
        return this.searchImages(`${artist} ${album}`, 20);
      }
    } catch (error) {
      console.error('Backend album artwork search failed:', error);
      // Fallback to regular search
      return this.searchImages(`${artist} ${album}`, 20);
    }
  }
  
  // Download image from URL and convert to blob for upload
  async downloadImage(imageUrl: string): Promise<Blob> {
    try {
      // YouTube thumbnails are served with CORS headers, so we can fetch them directly
      const response = await fetch(imageUrl, {
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Ensure it's a valid image blob
      if (!blob.type.startsWith('image/')) {
        throw new Error('Downloaded content is not a valid image');
      }
      
      return blob;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }
  
  // Get higher quality version of YouTube thumbnail via backend
  async getHighQualityThumbnail(videoId: string, quality: 'maxres' | 'standard' | 'high' | 'medium' = 'maxres'): Promise<string> {
    // For now, just return direct YouTube URL construction since we don't have a specific API endpoint for this
    // This can be enhanced later if needed
    const thumbnailUrls = {
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 1280x720
      standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,   // 640x480
      high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,       // 480x360
      medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`      // 320x180
    };
    return thumbnailUrls[quality];
  }
  
  // Check if a YouTube thumbnail exists at maxres quality
  async checkThumbnailExists(videoId: string): Promise<boolean> {
    try {
      const thumbnailUrl = await this.getHighQualityThumbnail(videoId, 'maxres');
      const response = await fetch(thumbnailUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private getFallbackImages(query: string, limit: number): SearchImage[] {
    // Fallback to music-themed placeholder images
    const fallbackImages: SearchImage[] = [];
    
    for (let i = 1; i <= limit; i++) {
      fallbackImages.push({
        id: `fallback-${query}-${i}`,
        url: `https://via.placeholder.com/500x500/1f2937/82aaf2?text=${encodeURIComponent(query)}`,
        thumbnail: `https://via.placeholder.com/200x200/1f2937/82aaf2?text=${encodeURIComponent(query)}`,
        title: `${query} - Album Cover ${i}`,
        source: 'Fallback',
        width: 500,
        height: 500
      });
    }
    
    return fallbackImages;
  }
}

export const imageSearchService = new ImageSearchService();