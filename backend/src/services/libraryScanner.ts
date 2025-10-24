import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import type { IPicture } from 'music-metadata';
import { parseFile } from 'music-metadata';
import pLimit from 'p-limit';
import sharp from 'sharp';

import config from '../config/config.js';
import Database from '../config/database.js';
import AlbumModel from '../models/Album.js';
import ArtistModel from '../models/Artist.js';
import SettingsModel from '../models/Settings.js';
import SongModel, { type CreateSongData } from '../models/Song.js';
import logger from '../utils/logger.js';

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
  parallelism?: number;
}

export interface ScanResult {
  filesScanned: number;
  filesAdded: number;
  filesUpdated: number;
  errors: string[];
}

export interface ScanOptions {
  parallelism?: number;
  batchSize?: number;
}

// Database/DTO types
interface ScanHistoryRow {
  id: number;
  started_at: string;
  completed_at?: string | null;
  scan_path: string;
  status: string;
  files_scanned?: number | null;
  files_added?: number | null;
  files_updated?: number | null;
  errors_count?: number | null;
  error_message?: string | null;
}

interface LibraryStats {
  songs: number;
  artists: number;
  albums: number;
  totalDuration: number;
  formatHours: number;
}

export class LibraryScanner {
  private db = Database;
  private isScanning = false;
  private currentScan: ScanProgress | null = null;
  private watcher: chokidar.FSWatcher | null = null;

  constructor() {
    this.setupFileWatcher();
  }

  private async setupFileWatcher(): Promise<void> {
    try {
      const paths = await SettingsModel.getActivePaths();
      if (paths.length === 0) {
        logger.info('No active library paths configured for file watching');
        return;
      }

      this.watcher = chokidar.watch(paths, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        usePolling: false, // Use native file system events (more efficient)
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
        depth: 99, // Still watch subdirectories but don't go too deep
        // Reduce file descriptor usage
        alwaysStat: false,
        atomic: false,
      });

      this.watcher
        .on('add', (filePath) => {
          if (this.isSupportedAudioFile(filePath)) {
            logger.info(`New audio file detected: ${filePath}`);
            this.scanFile(filePath).catch((error) => {
              logger.error(`Error scanning new file ${filePath}:`, error);
            });
          }
        })
        .on('unlink', (filePath) => {
          this.removeDeletedFile(filePath).catch((error) => {
            logger.error(`Error removing deleted file ${filePath}:`, error);
          });
        })
        .on('error', (error) => {
          logger.error('File watcher error:', error);
        });

      logger.info('File watcher initialized for paths:', paths);
    } catch (error) {
      logger.error('Failed to setup file watcher:', error);
    }
  }

  async startScan(
    scanPaths?: string[],
    options?: ScanOptions,
  ): Promise<number> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    let paths: string[];
    if (scanPaths) {
      paths = scanPaths;
    } else {
      // Get active library paths from database
      paths = await SettingsModel.getActivePaths();
    }

    if (paths.length === 0) {
      throw new Error('No library paths configured');
    }

    this.isScanning = true;

    const result = await this.db.run(
      `INSERT INTO scan_history (started_at, scan_path, status)
       VALUES (CURRENT_TIMESTAMP, ?, 'running')`,
      [JSON.stringify(paths)],
    );

    const lastId = result.lastID;
    if (lastId == null) {
      throw new Error('Failed to create scan history record');
    }
    const scanId = lastId;

    // Determine effective parallelism
    const parallelism = await this.resolveParallelism(options);

    this.currentScan = {
      id: scanId,
      status: 'running',
      filesScanned: 0,
      filesAdded: 0,
      filesUpdated: 0,
      errorsCount: 0,
      startedAt: new Date().toISOString(),
      totalFiles: 0,
      progress: 0,
      parallelism,
    };

    const effectiveOptions = { ...options, parallelism };

    this.performScan(scanId, paths, effectiveOptions)
      .catch((error) => {
        logger.error('Scan failed:', error);
        this.updateScanStatus(scanId, 'failed', (error as Error).message);
      })
      .finally(() => {
        this.isScanning = false;
        this.currentScan = null;
      });

    return scanId;
  }

  private async performScan(
    scanId: number,
    paths: string[],
    options?: ScanOptions,
  ): Promise<void> {
    const errors: string[] = [];

    try {
      const parallelism = await this.resolveParallelism(options);
      const allFiles = await this.listAllAudioFiles(
        paths,
        errors,
        parallelism,
        (n) => this.incrementDiscoveredCount(n),
      );

      logger.info(
        `Processing ${allFiles.length} files with parallelism: ${parallelism}`,
      );

      const results = await this.processFilesWithConcurrency(
        allFiles,
        parallelism,
      );

      const aggregation = this.aggregateProcessingResults(results);
      errors.push(...aggregation.errors);

      await this.finalizeSuccess(scanId, aggregation, errors.length);

      logger.info(
        `Scan completed: ${aggregation.filesScanned} scanned, ${aggregation.filesAdded} added, ${aggregation.filesUpdated} updated, ${errors.length} errors`,
      );
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.finalizeFailure(scanId, err);
      throw err;
    }
  }

  // SRP: options resolution (IoC-friendly)
  private async resolveParallelism(options?: ScanOptions): Promise<number> {
    if (options?.parallelism) return options.parallelism;
    return parseInt(
      (await SettingsModel.getSetting('scan_parallelism')) || '5',
      10,
    );
  }

  // SRP: collect files and accumulate path errors
  private async listAllAudioFiles(
    paths: string[],
    errors: string[],
    parallelism?: number,
    onDiscover?: (n: number) => void,
  ): Promise<string[]> {
    const discoveredFiles: string[] = [];
    const limit = pLimit(Math.max(1, parallelism || 5));

    const processDirectory = async (dirPath: string): Promise<void> => {
      try {
        const items = await limit(() => fs.promises.readdir(dirPath));
        logger.info(`Processing directory: ${dirPath}`);
        await Promise.all(
          items.map(async (item) => {
            const itemPath = path.join(dirPath, item);
            try {
              const stats = await limit(() => fs.promises.stat(itemPath));
              if (stats.isDirectory()) {
                await processDirectory(itemPath);
              } else if (
                stats.isFile() &&
                this.isSupportedAudioFile(itemPath)
              ) {
                logger.info(`Found audio file: ${itemPath}`);
                discoveredFiles.push(itemPath);
                if (onDiscover) onDiscover(1);
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              logger.warn(`Failed to stat ${itemPath}:`, msg);
            }
          }),
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to read directory ${dirPath}:`, msg);
      }
    };

    const roots = paths.filter((p) => {
      if (!fs.existsSync(p)) {
        const error = `Scan path does not exist: ${p}`;
        errors.push(error);
        logger.warn(error);
        return false;
      }
      return true;
    });

    await Promise.all(roots.map((p) => processDirectory(p)));

    logger.info(
      `Found ${discoveredFiles.length} audio files across ${roots.length} root path(s)`,
    );
    return discoveredFiles;
  }

  // SRP: process a single file
  private async processSingleFile(
    filePath: string,
  ): Promise<{ added: boolean; updated: boolean; error?: string }> {
    try {
      const fileStats = await fs.promises.stat(filePath);
      const existingSong = await SongModel.findByPath(filePath);

      if (existingSong && existingSong.file_size === fileStats.size) {
        return { added: false, updated: false };
      }

      await this.scanFile(filePath);

      return {
        added: !existingSong,
        updated: !!existingSong,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const errorMsg = `Error processing ${filePath}: ${msg}`;
      logger.error(errorMsg);
      return { added: false, updated: false, error: errorMsg };
    }
  }

  // SRP: concurrency and logging
  private async processFilesWithConcurrency(
    files: string[],
    parallelism: number,
  ): Promise<
    PromiseSettledResult<{
      added: boolean;
      updated: boolean;
      error?: string;
    }>[]
  > {
    const limit = pLimit(parallelism);
    const tasks = files.map((filePath, index) =>
      limit(async () => {
        const startTime = Date.now();
        const result = await this.processSingleFile(filePath);
        const duration = Date.now() - startTime;
        if (index % 10 === 0) {
          logger.info(
            `Processed ${path.basename(filePath)} in ${duration}ms (parallelism: ${parallelism})`,
          );
        }
        this.updateCurrentScanOnFileResult(result, filePath);
        return result;
      }),
    );
    return await Promise.allSettled(tasks);
  }

  // SRP: aggregation
  private aggregateProcessingResults(
    results: PromiseSettledResult<{
      added: boolean;
      updated: boolean;
      error?: string;
    }>[],
  ): {
    filesScanned: number;
    filesAdded: number;
    filesUpdated: number;
    errors: string[];
  } {
    let processedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        processedCount++;
        if (result.value.added) addedCount++;
        if (result.value.updated) updatedCount++;
        if (result.value.error) errors.push(result.value.error);
      } else {
        errors.push(`Promise rejected: ${result.reason}`);
      }
    }

    return {
      filesScanned: processedCount,
      filesAdded: addedCount,
      filesUpdated: updatedCount,
      errors,
    };
  }

  // SRP: progress & finalization helpers
  private incrementDiscoveredCount(delta: number): void {
    if (this.currentScan) {
      const current = this.currentScan.totalFiles || 0;
      this.currentScan.totalFiles = current + delta;
    }
  }

  private updateCurrentScanOnFileResult(
    result: { added: boolean; updated: boolean; error?: string },
    filePath: string,
  ): void {
    if (!this.currentScan) return;

    this.currentScan.filesScanned += 1;
    if (result.added) this.currentScan.filesAdded += 1;
    if (result.updated) this.currentScan.filesUpdated += 1;
    if (result.error) this.currentScan.errorsCount += 1;
    this.currentScan.currentFile = filePath;

    const total = this.currentScan.totalFiles || 0;
    if (total > 0) {
      const pct = Math.floor((this.currentScan.filesScanned / total) * 100);
      this.currentScan.progress = Math.max(0, Math.min(100, pct));
    }
  }

  private async finalizeSuccess(
    scanId: number,
    aggregation: {
      filesScanned: number;
      filesAdded: number;
      filesUpdated: number;
    },
    errorsCount: number,
  ): Promise<void> {
    await this.updateScanResults(
      scanId,
      aggregation.filesScanned,
      aggregation.filesAdded,
      aggregation.filesUpdated,
      errorsCount,
    );
    await this.updateScanStatus(scanId, 'completed');
    if (this.currentScan) {
      this.currentScan.progress = 100;
      this.currentScan.status = 'completed';
      this.currentScan.completedAt = new Date().toISOString();
    }
  }

  private async finalizeFailure(scanId: number, error: Error): Promise<void> {
    await this.updateScanStatus(scanId, 'failed', error.message);
    if (this.currentScan) {
      this.currentScan.status = 'failed';
      this.currentScan.errorMessage = error.message;
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      if (!this.isSupportedAudioFile(filePath)) {
        return;
      }

      const metadata = await parseFile(filePath);
      const fileStats = fs.statSync(filePath);

      const artistName = metadata.common.artist || 'Unknown Artist';
      const albumTitle = metadata.common.album;
      const title =
        metadata.common.title ||
        path.basename(filePath, path.extname(filePath));

      const artist = await ArtistModel.findOrCreate(artistName);

      let album = null;
      if (albumTitle) {
        album = await AlbumModel.findOrCreate(
          albumTitle,
          artist.id,
          metadata.common.year,
        );

        if (
          metadata.common.picture &&
          metadata.common.picture.length > 0 &&
          !album.artwork_path
        ) {
          const artworkPath = await this.saveAlbumArtwork(
            album.id,
            metadata.common.picture[0] as IPicture,
          );
          if (artworkPath) {
            await AlbumModel.updateArtwork(album.id, artworkPath);
          }
        }
      }

      const songData: CreateSongData = {
        title,
        artist_id: artist.id,
        album_id: album?.id,
        file_path: filePath,
        file_size: fileStats.size,
        duration: metadata.format.duration
          ? Math.round(metadata.format.duration)
          : undefined,
        track_number: metadata.common.track?.no,
        genre: metadata.common.genre?.join(', '),
        year: metadata.common.year,
        bitrate: metadata.format.bitrate,
        sample_rate: metadata.format.sampleRate,
        source: 'local',
      };

      const existingSong = await SongModel.findByPath(filePath);
      if (existingSong) {
        await SongModel.updateSong(existingSong.id, songData);
      } else {
        await SongModel.create(songData);
      }
    } catch (error: unknown) {
      logger.error(`Failed to scan file ${filePath}:`, error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async saveAlbumArtwork(
    albumId: number,
    picture: IPicture,
  ): Promise<string | null> {
    try {
      const artworkDir = path.join(config.uploadPath, 'artwork');
      if (!fs.existsSync(artworkDir)) {
        fs.mkdirSync(artworkDir, { recursive: true });
      }

      const filename = `album_${albumId}.jpg`;
      const artworkPath = path.join(artworkDir, filename);

      await sharp(picture.data)
        .jpeg({ quality: 85 })
        .resize(500, 500, { fit: 'cover' })
        .toFile(artworkPath);

      return `/uploads/artwork/${filename}`;
    } catch (error: unknown) {
      logger.error('Failed to save album artwork:', error);
      return null;
    }
  }

  private isSupportedAudioFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return config.supportedFormats.includes(ext);
  }

  private async removeDeletedFile(filePath: string): Promise<void> {
    try {
      const song = await SongModel.findByPath(filePath);
      if (song) {
        await SongModel.deleteSong(song.id);
        logger.info(`Removed deleted file from library: ${filePath}`);
      }
    } catch (error: unknown) {
      logger.error(`Failed to remove deleted file ${filePath}:`, error);
    }
  }

  private async updateScanResults(
    scanId: number,
    filesScanned: number,
    filesAdded: number,
    filesUpdated: number,
    errorsCount: number,
  ): Promise<void> {
    await this.db.run(
      `UPDATE scan_history
       SET files_scanned = ?, files_added = ?, files_updated = ?, errors_count = ?
       WHERE id = ?`,
      [filesScanned, filesAdded, filesUpdated, errorsCount, scanId],
    );
  }

  private async updateScanStatus(
    scanId: number,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.db.run(
      `UPDATE scan_history
       SET status = ?, completed_at = CURRENT_TIMESTAMP, error_message = ?
       WHERE id = ?`,
      [status, errorMessage || null, scanId],
    );
  }

  async getScanHistory(): Promise<ScanHistoryRow[]> {
    return (await this.db.query(
      'SELECT * FROM scan_history ORDER BY started_at DESC LIMIT 50',
    )) as ScanHistoryRow[];
  }

  getCurrentScan(): ScanProgress | null {
    return this.currentScan;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  async getLibraryStats(): Promise<LibraryStats> {
    const songCount = await SongModel.getSongCount();
    const artistCount = await ArtistModel.getArtistCount();
    const albumCount = await AlbumModel.getAlbumCount();
    const totalDuration = await SongModel.getTotalDuration();

    return {
      songs: songCount,
      artists: artistCount,
      albums: albumCount,
      totalDuration,
      formatHours: Math.round((totalDuration / 3600) * 100) / 100,
    };
  }

  async getScanOptions(): Promise<ScanOptions> {
    const parallelism = parseInt(
      (await SettingsModel.getSetting('scan_parallelism')) || '5',
      10,
    );
    const batchSize = parseInt(
      (await SettingsModel.getSetting('scan_batch_size')) || '50',
      10,
    );

    return {
      parallelism,
      batchSize,
    };
  }

  async setScanOptions(options: ScanOptions): Promise<void> {
    if (options.parallelism !== undefined) {
      await SettingsModel.setSetting(
        'scan_parallelism',
        options.parallelism.toString(),
      );
    }
    if (options.batchSize !== undefined) {
      await SettingsModel.setSetting(
        'scan_batch_size',
        options.batchSize.toString(),
      );
    }
  }

  async refreshFileWatcher(): Promise<void> {
    // Close existing watcher
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Setup new watcher with updated paths
    await this.setupFileWatcher();
  }

  destroy(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export default new LibraryScanner();
