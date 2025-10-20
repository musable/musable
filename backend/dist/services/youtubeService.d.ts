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
declare class YouTubeService {
    private youtubeApiKey;
    searchImages(query: string, limit?: number): Promise<SearchImage[]>;
    private searchYouTube;
    private mapYouTubeResult;
    private cleanTitle;
    private getMockYouTubeResults;
    private getFallbackImages;
    searchAlbumArtwork(artist: string, album: string): Promise<SearchImage[]>;
    getHighQualityThumbnail(videoId: string, quality?: 'maxres' | 'standard' | 'high' | 'medium'): string;
}
export declare const youtubeService: YouTubeService;
export {};
//# sourceMappingURL=youtubeService.d.ts.map