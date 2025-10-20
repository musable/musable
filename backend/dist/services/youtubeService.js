"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config/config"));
const logger_1 = __importDefault(require("../utils/logger"));
class YouTubeService {
    constructor() {
        this.youtubeApiKey = config_1.default.youtubeApiKey;
    }
    async searchImages(query, limit = 20) {
        const results = [];
        try {
            logger_1.default.info(`🔍 YouTube Service: Searching for "${query}" (limit: ${limit})`);
            const youtubeResults = await this.searchYouTube(query, Math.ceil(limit * 0.8));
            results.push(...youtubeResults);
            if (results.length < limit) {
                const alternativeQueries = [
                    `${query} official music video`,
                    `${query} official audio`,
                    `${query} album`,
                    `${query} cover`
                ];
                for (const altQuery of alternativeQueries) {
                    if (results.length >= limit)
                        break;
                    try {
                        const altResults = await this.searchYouTube(altQuery, 5);
                        const uniqueResults = altResults.filter(newResult => !results.some(existingResult => existingResult.videoId === newResult.videoId));
                        results.push(...uniqueResults);
                    }
                    catch (error) {
                        logger_1.default.warn(`Alternative YouTube search failed for: ${altQuery}`, error);
                    }
                }
            }
            if (results.length === 0) {
                logger_1.default.warn('No YouTube results found, using fallback');
                return this.getFallbackImages(query, limit);
            }
            logger_1.default.info(`🎵 YouTube Service: Found ${results.length} results for "${query}"`);
            return results.slice(0, limit);
        }
        catch (error) {
            logger_1.default.error('Error searching images:', error);
            return this.getFallbackImages(query, limit);
        }
    }
    async searchYouTube(query, limit) {
        try {
            if (this.youtubeApiKey && this.youtubeApiKey.trim() !== '') {
                logger_1.default.info('Using YouTube Data API v3 for search');
                const response = await axios_1.default.get('https://www.googleapis.com/youtube/v3/search', {
                    params: {
                        key: this.youtubeApiKey,
                        q: query,
                        part: 'snippet',
                        type: 'video',
                        maxResults: limit,
                        videoCategoryId: '10',
                        order: 'relevance'
                    }
                });
                if (response.data.items && response.data.items.length > 0) {
                    return response.data.items.map((item) => this.mapYouTubeResult(item));
                }
            }
            else {
                logger_1.default.warn('YouTube API key not found. Using demo thumbnails. Add YOUTUBE_API_KEY to your .env file for real search results.');
            }
            return this.getMockYouTubeResults(query, limit);
        }
        catch (error) {
            logger_1.default.error('YouTube search failed:', error);
            return this.getMockYouTubeResults(query, limit);
        }
    }
    mapYouTubeResult(item) {
        const thumbnails = item.snippet.thumbnails;
        const getBestThumbnail = () => {
            if (thumbnails.maxres)
                return thumbnails.maxres;
            if (thumbnails.standard)
                return thumbnails.standard;
            if (thumbnails.high)
                return thumbnails.high;
            if (thumbnails.medium)
                return thumbnails.medium;
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
    cleanTitle(title) {
        return title
            .replace(/\(Official.*?\)/gi, '')
            .replace(/\[Official.*?\]/gi, '')
            .replace(/- Official.*$/gi, '')
            .replace(/Official.*$/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    getMockYouTubeResults(query, limit) {
        const mockResults = [];
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
    getFallbackImages(query, limit) {
        const fallbackImages = [];
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
    async searchAlbumArtwork(artist, album) {
        const queries = [
            `${artist} ${album}`,
            `${artist} ${album} official music video`,
            `${artist} ${album} official audio`,
            `${artist} ${album} full album`,
            `${album} ${artist}`,
            `${artist} ${album} playlist`,
            `${artist} music`
        ];
        const allResults = [];
        for (const query of queries) {
            try {
                const results = await this.searchImages(query, 5);
                allResults.push(...results);
                if (allResults.length >= 20)
                    break;
            }
            catch (error) {
                logger_1.default.error(`Failed to search for: ${query}`, error);
            }
        }
        const uniqueResults = allResults.filter((image, index, arr) => arr.findIndex(img => (img.videoId && image.videoId && img.videoId === image.videoId) ||
            (!img.videoId && img.url === image.url)) === index);
        return uniqueResults.slice(0, 20);
    }
    getHighQualityThumbnail(videoId, quality = 'maxres') {
        const thumbnailUrls = {
            maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
            high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
        return thumbnailUrls[quality];
    }
}
exports.youtubeService = new YouTubeService();
//# sourceMappingURL=youtubeService.js.map