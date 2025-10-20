export interface ScanProgress {
    id: number;
    status: 'running' | 'completed' | 'failed';
    filesScanned: number;
    filesAdded: number;
    filesUpdated: number;
    errorsCount: number;
    startedAt: string;
    completedAt?: string;
    currentFile?: string;
    errorMessage?: string;
    totalFiles?: number;
    progress?: number;
}
export interface ScanResult {
    filesScanned: number;
    filesAdded: number;
    filesUpdated: number;
    errors: string[];
}
export declare class LibraryScanner {
    private db;
    private isScanning;
    private currentScan;
    private watcher;
    constructor();
    private setupFileWatcher;
    startScan(scanPaths?: string[]): Promise<number>;
    private performScan;
    private scanFile;
    private saveAlbumArtwork;
    private findAudioFiles;
    private isSupportedAudioFile;
    private removeDeletedFile;
    private updateScanResults;
    private updateScanStatus;
    getScanHistory(): Promise<any[]>;
    getCurrentScan(): ScanProgress | null;
    isCurrentlyScanning(): boolean;
    getLibraryStats(): Promise<any>;
    refreshFileWatcher(): Promise<void>;
    destroy(): void;
}
declare const _default: LibraryScanner;
export default _default;
//# sourceMappingURL=libraryScanner.d.ts.map