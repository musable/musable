"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryScanner = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const music_metadata_1 = require("music-metadata");
const sharp_1 = __importDefault(require("sharp"));
const chokidar_1 = __importDefault(require("chokidar"));
const util_1 = require("util");
const config_1 = __importDefault(require("../config/config"));
const logger_1 = __importDefault(require("../utils/logger"));
const Song_1 = __importDefault(require("../models/Song"));
const Artist_1 = __importDefault(require("../models/Artist"));
const Album_1 = __importDefault(require("../models/Album"));
const Settings_1 = __importDefault(require("../models/Settings"));
const database_1 = __importDefault(require("../config/database"));
class LibraryScanner {
    constructor() {
        this.db = database_1.default;
        this.isScanning = false;
        this.currentScan = null;
        this.watcher = null;
        this.setupFileWatcher();
    }
    async setupFileWatcher() {
        try {
            const paths = await Settings_1.default.getActivePaths();
            if (paths.length === 0) {
                logger_1.default.info('No active library paths configured for file watching');
                return;
            }
            this.watcher = chokidar_1.default.watch(paths, {
                ignored: /(^|[\/\\])\../,
                persistent: true,
                ignoreInitial: true,
                usePolling: false,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                },
                depth: 99,
                alwaysStat: false,
                atomic: false
            });
            this.watcher
                .on('add', (filePath) => {
                if (this.isSupportedAudioFile(filePath)) {
                    logger_1.default.info(`New audio file detected: ${filePath}`);
                    this.scanFile(filePath).catch(error => {
                        logger_1.default.error(`Error scanning new file ${filePath}:`, error);
                    });
                }
            })
                .on('unlink', (filePath) => {
                this.removeDeletedFile(filePath).catch(error => {
                    logger_1.default.error(`Error removing deleted file ${filePath}:`, error);
                });
            })
                .on('error', error => {
                logger_1.default.error('File watcher error:', error);
            });
            logger_1.default.info('File watcher initialized for paths:', paths);
        }
        catch (error) {
            logger_1.default.error('Failed to setup file watcher:', error);
        }
    }
    async startScan(scanPaths) {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }
        let paths;
        if (scanPaths) {
            paths = scanPaths;
        }
        else {
            paths = await Settings_1.default.getActivePaths();
        }
        if (paths.length === 0) {
            throw new Error('No library paths configured');
        }
        this.isScanning = true;
        const result = await this.db.run(`INSERT INTO scan_history (started_at, scan_path, status) 
       VALUES (CURRENT_TIMESTAMP, ?, 'running')`, [JSON.stringify(paths)]);
        const scanId = result.lastID;
        this.currentScan = {
            id: scanId,
            status: 'running',
            filesScanned: 0,
            filesAdded: 0,
            filesUpdated: 0,
            errorsCount: 0,
            startedAt: new Date().toISOString(),
            totalFiles: 0,
            progress: 0
        };
        this.performScan(scanId, paths).catch(error => {
            logger_1.default.error('Scan failed:', error);
            this.updateScanStatus(scanId, 'failed', error.message);
        }).finally(() => {
            this.isScanning = false;
            this.currentScan = null;
        });
        return scanId;
    }
    async performScan(scanId, paths) {
        const errors = [];
        let filesScanned = 0;
        let filesAdded = 0;
        let filesUpdated = 0;
        let totalFiles = 0;
        try {
            for (const scanPath of paths) {
                if (fs_1.default.existsSync(scanPath)) {
                    const audioFiles = await this.findAudioFiles(scanPath);
                    totalFiles += audioFiles.length;
                }
            }
            if (this.currentScan) {
                this.currentScan.totalFiles = totalFiles;
            }
            for (const scanPath of paths) {
                if (!fs_1.default.existsSync(scanPath)) {
                    const error = `Scan path does not exist: ${scanPath}`;
                    errors.push(error);
                    logger_1.default.warn(error);
                    continue;
                }
                const audioFiles = await this.findAudioFiles(scanPath);
                logger_1.default.info(`Found ${audioFiles.length} audio files in ${scanPath}`);
                for (const filePath of audioFiles) {
                    try {
                        if (this.currentScan) {
                            this.currentScan.currentFile = path_1.default.basename(filePath);
                            this.currentScan.filesScanned = filesScanned;
                            this.currentScan.filesAdded = filesAdded;
                            this.currentScan.filesUpdated = filesUpdated;
                            this.currentScan.errorsCount = errors.length;
                            this.currentScan.progress = totalFiles > 0 ? Math.round((filesScanned / totalFiles) * 100) : 0;
                        }
                        const existingSong = await Song_1.default.findByPath(filePath);
                        const fileStats = fs_1.default.statSync(filePath);
                        if (existingSong && existingSong.file_size === fileStats.size) {
                            filesScanned++;
                            continue;
                        }
                        await this.scanFile(filePath);
                        if (existingSong) {
                            filesUpdated++;
                        }
                        else {
                            filesAdded++;
                        }
                        filesScanned++;
                        if (filesScanned % 10 === 0) {
                            await this.updateScanResults(scanId, filesScanned, filesAdded, filesUpdated, errors.length);
                        }
                    }
                    catch (error) {
                        const errorMsg = `Error processing ${filePath}: ${error.message}`;
                        errors.push(errorMsg);
                        logger_1.default.error(errorMsg);
                    }
                }
            }
            await this.updateScanResults(scanId, filesScanned, filesAdded, filesUpdated, errors.length);
            await this.updateScanStatus(scanId, 'completed');
            if (this.currentScan) {
                this.currentScan.progress = 100;
                this.currentScan.status = 'completed';
                this.currentScan.completedAt = new Date().toISOString();
            }
            logger_1.default.info(`Scan completed: ${filesScanned} scanned, ${filesAdded} added, ${filesUpdated} updated, ${errors.length} errors`);
        }
        catch (error) {
            await this.updateScanStatus(scanId, 'failed', error.message);
            if (this.currentScan) {
                this.currentScan.status = 'failed';
                this.currentScan.errorMessage = error.message;
            }
            throw error;
        }
    }
    async scanFile(filePath) {
        try {
            if (!this.isSupportedAudioFile(filePath)) {
                return;
            }
            const metadata = await (0, music_metadata_1.parseFile)(filePath);
            const fileStats = fs_1.default.statSync(filePath);
            const artistName = metadata.common.artist || 'Unknown Artist';
            const albumTitle = metadata.common.album;
            const title = metadata.common.title || path_1.default.basename(filePath, path_1.default.extname(filePath));
            const artist = await Artist_1.default.findOrCreate(artistName);
            let album = null;
            if (albumTitle) {
                album = await Album_1.default.findOrCreate(albumTitle, artist.id, metadata.common.year);
                if (metadata.common.picture && metadata.common.picture.length > 0 && !album.artwork_path) {
                    const artworkPath = await this.saveAlbumArtwork(album.id, metadata.common.picture[0]);
                    if (artworkPath) {
                        await Album_1.default.updateArtwork(album.id, artworkPath);
                    }
                }
            }
            const songData = {
                title,
                artist_id: artist.id,
                album_id: album?.id,
                file_path: filePath,
                file_size: fileStats.size,
                duration: metadata.format.duration ? Math.round(metadata.format.duration) : undefined,
                track_number: metadata.common.track?.no,
                genre: metadata.common.genre?.join(', '),
                year: metadata.common.year,
                bitrate: metadata.format.bitrate,
                sample_rate: metadata.format.sampleRate,
                source: 'local'
            };
            const existingSong = await Song_1.default.findByPath(filePath);
            if (existingSong) {
                await Song_1.default.updateSong(existingSong.id, songData);
            }
            else {
                await Song_1.default.create(songData);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to scan file ${filePath}:`, error);
            throw error;
        }
    }
    async saveAlbumArtwork(albumId, picture) {
        try {
            const artworkDir = path_1.default.join(config_1.default.uploadPath, 'artwork');
            if (!fs_1.default.existsSync(artworkDir)) {
                fs_1.default.mkdirSync(artworkDir, { recursive: true });
            }
            const filename = `album_${albumId}.jpg`;
            const artworkPath = path_1.default.join(artworkDir, filename);
            await (0, sharp_1.default)(picture.data)
                .jpeg({ quality: 85 })
                .resize(500, 500, { fit: 'cover' })
                .toFile(artworkPath);
            return `/uploads/artwork/${filename}`;
        }
        catch (error) {
            logger_1.default.error('Failed to save album artwork:', error);
            return null;
        }
    }
    async findAudioFiles(dirPath) {
        const audioFiles = [];
        const readDir = (0, util_1.promisify)(fs_1.default.readdir);
        const stat = (0, util_1.promisify)(fs_1.default.stat);
        const processDirectory = async (currentPath) => {
            try {
                const items = await readDir(currentPath);
                for (const item of items) {
                    const itemPath = path_1.default.join(currentPath, item);
                    const itemStat = await stat(itemPath);
                    if (itemStat.isDirectory()) {
                        await processDirectory(itemPath);
                    }
                    else if (itemStat.isFile() && this.isSupportedAudioFile(itemPath)) {
                        audioFiles.push(itemPath);
                    }
                }
            }
            catch (error) {
                logger_1.default.warn(`Failed to read directory ${currentPath}:`, error.message);
            }
        };
        await processDirectory(dirPath);
        return audioFiles;
    }
    isSupportedAudioFile(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase().substring(1);
        return config_1.default.supportedFormats.includes(ext);
    }
    async removeDeletedFile(filePath) {
        try {
            const song = await Song_1.default.findByPath(filePath);
            if (song) {
                await Song_1.default.deleteSong(song.id);
                logger_1.default.info(`Removed deleted file from library: ${filePath}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to remove deleted file ${filePath}:`, error);
        }
    }
    async updateScanResults(scanId, filesScanned, filesAdded, filesUpdated, errorsCount) {
        await this.db.run(`UPDATE scan_history 
       SET files_scanned = ?, files_added = ?, files_updated = ?, errors_count = ?
       WHERE id = ?`, [filesScanned, filesAdded, filesUpdated, errorsCount, scanId]);
    }
    async updateScanStatus(scanId, status, errorMessage) {
        await this.db.run(`UPDATE scan_history 
       SET status = ?, completed_at = CURRENT_TIMESTAMP, error_message = ?
       WHERE id = ?`, [status, errorMessage || null, scanId]);
    }
    async getScanHistory() {
        return await this.db.query('SELECT * FROM scan_history ORDER BY started_at DESC LIMIT 50');
    }
    getCurrentScan() {
        return this.currentScan;
    }
    isCurrentlyScanning() {
        return this.isScanning;
    }
    async getLibraryStats() {
        const songCount = await Song_1.default.getSongCount();
        const artistCount = await Artist_1.default.getArtistCount();
        const albumCount = await Album_1.default.getAlbumCount();
        const totalDuration = await Song_1.default.getTotalDuration();
        return {
            songs: songCount,
            artists: artistCount,
            albums: albumCount,
            totalDuration,
            formatHours: Math.round(totalDuration / 3600 * 100) / 100
        };
    }
    async refreshFileWatcher() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        await this.setupFileWatcher();
    }
    destroy() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}
exports.LibraryScanner = LibraryScanner;
exports.default = new LibraryScanner();
//# sourceMappingURL=libraryScanner.js.map