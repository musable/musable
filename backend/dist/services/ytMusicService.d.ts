export interface YTMusicSearchResult {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration?: string;
    thumbnail: string;
    isAvailableLocally: boolean;
    source: 'youtube-music';
}
export interface DownloadProgress {
    id: string;
    status: 'downloading' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
}
declare class YTMusicService {
    private downloadProgress;
    private downloadsDir;
    constructor();
    private ensureDownloadDir;
    initialize(): Promise<void>;
    searchMusic(query: string): Promise<YTMusicSearchResult[]>;
    downloadSong(videoId: string): Promise<string>;
    private performDownload;
    private addDownloadedSongToDatabase;
    getDownloadProgress(downloadId: string): DownloadProgress | null;
    getAllActiveDownloads(): DownloadProgress[];
    private formatDuration;
}
declare const _default: YTMusicService;
export default _default;
//# sourceMappingURL=ytMusicService.d.ts.map