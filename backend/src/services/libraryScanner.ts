import chokidar from 'chokidar';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import pLimit from 'p-limit';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';

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

    const scanId = result.lastID!;

    // Get parallelism setting from database or use default
    const parallelism =
      options?.parallelism ||
      parseInt((await SettingsModel.getSetting('scan_parallelism')) || '5', 10);

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

    this.performScan(scanId, paths, options)
      .catch((error) => {
        logger.error('Scan failed:', error);
        this.updateScanStatus(scanId, 'failed', error.message);
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
    let filesScanned = 0;
    let filesAdded = 0;
    let filesUpdated = 0;
    let totalFiles = 0;

    try {
      // First, count all files to show accurate progress
      for (const scanPath of paths) {
        if (fs.existsSync(scanPath)) {
          const audioFiles = await this.findAudioFiles(scanPath);
          totalFiles += audioFiles.length;
        }
      }

      if (this.currentScan) {
        this.currentScan.totalFiles = totalFiles;
      }

      // Get parallelism setting
      const parallelism =
        options?.parallelism ||
        parseInt(
          (await SettingsModel.getSetting('scan_parallelism')) || '5',
          10,
        );

      // Create concurrency limiter
      const limit = pLimit(parallelism);

      // Collect all files to process
      const allFiles: string[] = [];
      for (const scanPath of paths) {
        if (!fs.existsSync(scanPath)) {
          const error = `Scan path does not exist: ${scanPath}`;
          errors.push(error);
          logger.warn(error);
          continue;
        }

        const audioFiles = await this.findAudioFiles(scanPath);
        logger.info(`Found ${audioFiles.length} audio files in ${scanPath}`);
        allFiles.push(...audioFiles);
      }

      // Process files in parallel with concurrency control
      const processFile = async (
        filePath: string,
      ): Promise<{ added: boolean; updated: boolean; error?: string }> => {
        try {
          const existingSong = await SongModel.findByPath(filePath);
          const fileStats = fs.statSync(filePath);

          if (existingSong && existingSong.file_size === fileStats.size) {
            return { added: false, updated: false };
          }

          await this.scanFile(filePath);

          return {
            added: !existingSong,
            updated: !!existingSong,
          };
        } catch (error: any) {
          const errorMsg = `Error processing ${filePath}: ${error.message}`;
          logger.error(errorMsg);
          return { added: false, updated: false, error: errorMsg };
        }
      };

      // Create promises with concurrency control
      const filePromises = allFiles.map((filePath) =>
        limit(async () => {
          const result = await processFile(filePath);

          // Thread-safe progress updates
          if (this.currentScan) {
            this.currentScan.currentFile = path.basename(filePath);
            this.currentScan.filesScanned = filesScanned + 1;

            if (result.added) {
              this.currentScan.filesAdded = filesAdded + 1;
            }
            if (result.updated) {
              this.currentScan.filesUpdated = filesUpdated + 1;
            }
            if (result.error) {
              this.currentScan.errorsCount = errors.length + 1;
              errors.push(result.error);
            }

            this.currentScan.progress =
              totalFiles > 0
                ? Math.round(((filesScanned + 1) / totalFiles) * 100)
                : 0;
          }

          return result;
        }),
      );

      // Process files in batches for progress updates
      const batchSize = options?.batchSize || 50;
      for (let i = 0; i < filePromises.length; i += batchSize) {
        const batch = filePromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);

        // Update counters
        filesScanned += batchResults.length;
        filesAdded += batchResults.filter((r) => r.added).length;
        filesUpdated += batchResults.filter((r) => r.updated).length;

        // Update database periodically
        await this.updateScanResults(
          scanId,
          filesScanned,
          filesAdded,
          filesUpdated,
          errors.length,
        );
      }

      // Final update with all results
      await this.updateScanResults(
        scanId,
        filesScanned,
        filesAdded,
        filesUpdated,
        errors.length,
      );
      await this.updateScanStatus(scanId, 'completed');

      if (this.currentScan) {
        this.currentScan.progress = 100;
        this.currentScan.status = 'completed';
        this.currentScan.completedAt = new Date().toISOString();
      }

      logger.info(
        `Scan completed: ${filesScanned} scanned, ${filesAdded} added, ${filesUpdated} updated, ${errors.length} errors`,
      );
    } catch (error: any) {
      await this.updateScanStatus(scanId, 'failed', error.message);
      if (this.currentScan) {
        this.currentScan.status = 'failed';
        this.currentScan.errorMessage = error.message;
      }
      throw error;
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
            metadata.common.picture[0],
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
    } catch (error: any) {
      logger.error(`Failed to scan file ${filePath}:`, error);
      throw error;
    }
  }

  private async saveAlbumArtwork(
    albumId: number,
    picture: any,
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
    } catch (error: any) {
      logger.error('Failed to save album artwork:', error);
      return null;
    }
  }

  private async findAudioFiles(dirPath: string): Promise<string[]> {
    const audioFiles: string[] = [];

    const readDir = promisify(fs.readdir);
    const stat = promisify(fs.stat);

    const processDirectory = async (currentPath: string): Promise<void> => {
      try {
        const items = await readDir(currentPath);

        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const itemStat = await stat(itemPath);

          if (itemStat.isDirectory()) {
            await processDirectory(itemPath);
          } else if (itemStat.isFile() && this.isSupportedAudioFile(itemPath)) {
            audioFiles.push(itemPath);
          }
        }
      } catch (error: any) {
        logger.warn(`Failed to read directory ${currentPath}:`, error.message);
      }
    };

    await processDirectory(dirPath);
    return audioFiles;
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
    } catch (error: any) {
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

  async getScanHistory(): Promise<any[]> {
    return await this.db.query(
      'SELECT * FROM scan_history ORDER BY started_at DESC LIMIT 50',
    );
  }

  getCurrentScan(): ScanProgress | null {
    return this.currentScan;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  async getLibraryStats(): Promise<any> {
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
