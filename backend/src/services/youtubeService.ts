import axios from 'axios';
import config from '../config/config';
import logger from '../utils/logger';

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

interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

class YouTubeService {
  private youtubeApiKey = config.youtubeApiKey;
  
  async searchImages(query: string, limit = 20): Promise<SearchImage[]> {
    const results: SearchImage[] = [];
    
    try {
      logger.info(`🔍 YouTube Service: Searching for "${query}" (limit: ${limit})`);
      
      // Primary: Search YouTube for music videos
      const youtubeResults = await this.searchYouTube(query, Math.ceil(limit * 0.8));
      results.push(...youtubeResults);
      
      // Secondary: Try alternative YouTube searches if we need more results
      if (results.length < limit) {
        const alternativeQueries = [
          `${query} official music video`,
          `${query} official audio`,
          `${query} album`,
          `${query} cover`
        ];
        
        for (const altQuery of alternativeQueries) {
          if (results.length >= limit) break;
          
          try {
            const altResults = await this.searchYouTube(altQuery, 5);
            // Add unique results only
            const uniqueResults = altResults.filter(newResult => 
              !results.some(existingResult => existingResult.videoId === newResult.videoId)
            );
            results.push(...uniqueResults);
          } catch (error) {
            logger.warn(`Alternative YouTube search failed for: ${altQuery}`, error);
          }
        }
      }
      
      // Fallback: Use mock data if no results (for development)
      if (results.length === 0) {
        logger.warn('No YouTube results found, using fallback');
        return this.getFallbackImages(query, limit);
      }
      
      logger.info(`🎵 YouTube Service: Found ${results.length} results for "${query}"`);
      return results.slice(0, limit);
    } catch (error) {
      logger.error('Error searching images:', error);
      // Complete fallback to mock data
      return this.getFallbackImages(query, limit);
    }
  }
  
  private async searchYouTube(query: string, limit: number): Promise<SearchImage[]> {
    try {
      // Check if YouTube API key is available
      if (this.youtubeApiKey && this.youtubeApiKey.trim() !== '') {
        logger.info('Using YouTube Data API v3 for search');
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: this.youtubeApiKey,
            q: query,
            part: 'snippet',
            type: 'video',
            maxResults: limit,
            videoCategoryId: '10', // Music category
            order: 'relevance'
          }
        });
        
        if (response.data.items && response.data.items.length > 0) {
          return response.data.items.map((item: YouTubeSearchResult) => this.mapYouTubeResult(item));
        }
      } else {
        logger.warn('YouTube API key not found. Using demo thumbnails. Add YOUTUBE_API_KEY to your .env file for real search results.');
      }
      
      // Fallback: Demo implementation using mock data that looks like real YouTube thumbnails
      return this.getMockYouTubeResults(query, limit);
      
    } catch (error) {
      logger.error('YouTube search failed:', error);
      // Fallback to mock data on error
      return this.getMockYouTubeResults(query, limit);
    }
  }
  
  private mapYouTubeResult(item: YouTubeSearchResult): SearchImage {
    const thumbnails = item.snippet.thumbnails;
    
    // Priority: maxres > standard > high > medium > default
    const getBestThumbnail = () => {
      if (thumbnails.maxres) return thumbnails.maxres;
      if (thumbnails.standard) return thumbnails.standard;
      if (thumbnails.high) return thumbnails.high;
      if (thumbnails.medium) return thumbnails.medium;
      return thumbnails.default;
    };
    
    const bestThumbnail = getBestThumbnail();
    
    return {
      id: `youtube-${item.id.videoId}`,
      url: bestThumbnail.url,
      thumbnail: thumbnails.medium?.url || thumbnails.default.url,
      title: this.cleanTitle(item.snippet.title),
      source: 'YouTube',
      width: bestThumbnail.width,
      height: bestThumbnail.height,
      videoId: item.id.videoId,
      channelTitle: item.snippet.channelTitle
    };
  }
  
  private cleanTitle(title: string): string {
    // Clean up common YouTube title patterns
    return title
      .replace(/\(Official.*?\)/gi, '')
      .replace(/\[Official.*?\]/gi, '')
      .replace(/- Official.*$/gi, '')
      .replace(/Official.*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private getMockYouTubeResults(query: string, limit: number): SearchImage[] {
    // High-quality mock data that simulates real YouTube thumbnails
    const mockResults: SearchImage[] = [];
    const mockVideoIds = [
      'dQw4w9WgXcQ', '9bZkp7q19f0', 'fJ9rUzIMcZQ', 'tbU3zdAgiX8', 'hTWKbfoikeg',
      'YQHsXMglC9A', 'djV11Xbc914', 'L_jWHffIx5E', 'SlPhMPnQ58k', 'tgbNymZ7vqY'
    ];
    
    for (let i = 0; i < limit && i < mockVideoIds.length; i++) {
      const videoId = mockVideoIds[i] || `mock${i}`;
      mockResults.push({
        id: `youtube-${videoId}`,
        url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: `${query} - Music Video ${i + 1}`,
        source: 'YouTube',
        width: 1280,
        height: 720,
        videoId: videoId,
        channelTitle: `${query} - Artist Channel`
      });
    }
    
    return mockResults;
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
  
  // Fetch album artwork specifically for music using YouTube thumbnails
  async searchAlbumArtwork(artist: string, album: string): Promise<SearchImage[]> {
    const queries = [
      `${artist} ${album}`,
      `${artist} ${album} official music video`,
      `${artist} ${album} official audio`,
      `${artist} ${album} full album`,
      `${album} ${artist}`,
      `${artist} ${album} playlist`,
      `${artist} music`
    ];
    
    const allResults: SearchImage[] = [];
    
    for (const query of queries) {
      try {
        const results = await this.searchImages(query, 5);
        allResults.push(...results);
        
        if (allResults.length >= 20) break;
      } catch (error) {
        logger.error(`Failed to search for: ${query}`, error);
      }
    }
    
    // Remove duplicates based on videoId (for YouTube) or URL (for others)
    const uniqueResults = allResults.filter((image, index, arr) => 
      arr.findIndex(img => 
        (img.videoId && image.videoId && img.videoId === image.videoId) || 
        (!img.videoId && img.url === image.url)
      ) === index
    );
    
    return uniqueResults.slice(0, 20);
  }
  
  // Get higher quality version of YouTube thumbnail
  getHighQualityThumbnail(videoId: string, quality: 'maxres' | 'standard' | 'high' | 'medium' = 'maxres'): string {
    // YouTube thumbnail URL patterns
    const thumbnailUrls = {
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 1280x720
      standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,   // 640x480
      high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,       // 480x360
      medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`      // 320x180
    };
    
    return thumbnailUrls[quality];
  }
}

export const youtubeService = new YouTubeService();