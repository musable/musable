"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const sharp_1 = __importDefault(require("sharp"));
const musicMetadata = __importStar(require("music-metadata"));
const Song_1 = __importDefault(require("../models/Song"));
const Artist_1 = __importDefault(require("../models/Artist"));
const Album_1 = __importDefault(require("../models/Album"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class YTMusicService {
    constructor() {
        this.downloadProgress = new Map();
        this.downloadsDir = path_1.default.join(process.cwd(), 'yt-downloads');
        this.ensureDownloadDir();
    }
    async ensureDownloadDir() {
        try {
            await promises_1.default.access(this.downloadsDir);
        }
        catch {
            await promises_1.default.mkdir(this.downloadsDir, { recursive: true });
        }
    }
    async initialize() {
        console.log('YTMusic service initialized (using yt-dlp) // v3: real-time progress tracking');
    }
    async searchMusic(query) {
        try {
            console.log(`🎵 YTMusic: Searching for "${query}" using yt-dlp...`);
            const searchQuery = `ytsearch15:${query}`;
            const command = `yt-dlp "${searchQuery}" --flat-playlist -j --skip-download --no-warnings --quiet --no-progress`;
            const { stdout } = await execAsync(command);
            const lines = stdout.trim().split('\n').filter(line => line.trim());
            console.log(`🎵 YTMusic: Found ${lines.length} raw results from yt-dlp`);
            const ytMusicResults = [];
            for (const line of lines) {
                try {
                    const result = JSON.parse(line);
                    const existingSong = await Song_1.default.findByYoutubeId(result.id);
                    const isAvailable = !!existingSong;
                    if (!isAvailable) {
                        const artistName = result.uploader || result.channel || 'Unknown Artist';
                        const title = result.title;
                        if (title.toLowerCase().trim() === artistName.toLowerCase().trim()) {
                            console.log(`🎵 YTMusic: Skipped "${title}" - title matches artist name (likely channel page)`);
                            continue;
                        }
                        if (title.toLowerCase().trim() === artistName.toLowerCase().trim()) {
                            console.log(`🎵 YTMusic: Skipped "${title}" - appears to be channel page`);
                            continue;
                        }
                        const durationSeconds = result.duration;
                        const formattedDuration = (durationSeconds && durationSeconds > 0)
                            ? this.formatDuration(Math.floor(durationSeconds))
                            : undefined;
                        ytMusicResults.push({
                            id: result.id,
                            title: result.title,
                            artist: artistName,
                            album: undefined,
                            duration: formattedDuration,
                            thumbnail: result.thumbnails?.[0]?.url || '',
                            isAvailableLocally: false,
                            source: 'youtube-music'
                        });
                        console.log(`🎵 YTMusic: Added "${result.title}" by "${artistName}" to results`);
                    }
                    else {
                        console.log(`🎵 YTMusic: Skipped "${result.title}" - already downloaded (youtube_id: ${result.id})`);
                    }
                }
                catch (parseError) {
                    console.error('Error parsing yt-dlp result line:', parseError);
                }
            }
            console.log(`🎵 YTMusic: Returning ${ytMusicResults.length} unique results`);
            return ytMusicResults;
        }
        catch (error) {
            console.error('YTMusic search error:', error);
            return [];
        }
    }
    async downloadSong(videoId) {
        const downloadId = `${videoId}-${Date.now()}`;
        this.downloadProgress.set(downloadId, {
            id: downloadId,
            status: 'downloading',
            progress: 0
        });
        this.performDownload(videoId, downloadId).catch(error => {
            console.error('Background download error:', error);
            this.downloadProgress.set(downloadId, {
                id: downloadId,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Download failed'
            });
        });
        return downloadId;
    }
    async performDownload(videoId, downloadId) {
        try {
            console.log(`🎵 YTMusic: Starting download for video ID: ${videoId}`);
            const infoCommand = `yt-dlp "https://www.youtube.com/watch?v=${videoId}" -j --no-warnings --quiet`;
            const { stdout: infoJson } = await execAsync(infoCommand);
            const songInfo = JSON.parse(infoJson);
            console.log(`🎵 YTMusic: Got song info:`, {
                title: songInfo.title,
                uploader: songInfo.uploader,
                duration: songInfo.duration
            });
            let cleanTitle = songInfo.title || `video-${videoId}`;
            cleanTitle = cleanTitle
                .replace(/\s*\(Official\s+Music\s+Video\)/gi, '')
                .replace(/\s*\[Official\s+Music\s+Video\]/gi, '')
                .replace(/\s*\(Official\s+Audio\)/gi, '')
                .replace(/\s*\[Official\s+Audio\]/gi, '')
                .replace(/\s*\(Official\s+Video\)/gi, '')
                .replace(/\s*\[Official\s+Video\]/gi, '')
                .replace(/\s*\(Lyric\s+Video\)/gi, '')
                .replace(/\s*\[Lyric\s+Video\]/gi, '')
                .replace(/\s*\(Lyrics\)/gi, '')
                .replace(/\s*\[Lyrics\]/gi, '');
            let extractedArtistName = '';
            if (songInfo.artist && typeof songInfo.artist === 'string') {
                extractedArtistName = songInfo.artist;
            }
            else if (songInfo.uploader && typeof songInfo.uploader === 'string') {
                extractedArtistName = songInfo.uploader;
            }
            else if (songInfo.channel && typeof songInfo.channel === 'string') {
                extractedArtistName = songInfo.channel;
            }
            if (extractedArtistName && cleanTitle.toLowerCase().startsWith(extractedArtistName.toLowerCase() + ' - ')) {
                cleanTitle = cleanTitle.substring(extractedArtistName.length + 3);
            }
            cleanTitle = cleanTitle.trim();
            const outputTemplate = path_1.default.join(this.downloadsDir, `${videoId}.%(ext)s`);
            this.downloadProgress.set(downloadId, {
                id: downloadId,
                status: 'downloading',
                progress: 0
            });
            console.log(`🎵 YTMusic: Starting download with real-time progress tracking...`);
            await new Promise((resolve, reject) => {
                const ytdlpProcess = (0, child_process_1.spawn)('yt-dlp', [
                    `https://www.youtube.com/watch?v=${videoId}`,
                    '-x',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '--embed-thumbnail',
                    '--embed-metadata',
                    '--add-metadata',
                    '-o', outputTemplate,
                    '--newline',
                    '--progress',
                    '--no-warnings'
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                let lastProgress = 0;
                const parseOutput = (output) => {
                    const downloadMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
                    if (downloadMatch) {
                        const progress = Math.floor(parseFloat(downloadMatch[1]));
                        if (progress > lastProgress) {
                            lastProgress = progress;
                            const cappedProgress = Math.min(progress, 95);
                            console.log(`📊 Progress update: ${progress}% -> setting to ${cappedProgress}% for downloadId: ${downloadId}`);
                            this.downloadProgress.set(downloadId, {
                                id: downloadId,
                                status: 'downloading',
                                progress: cappedProgress
                            });
                            console.log(`📊 Progress stored in map:`, this.downloadProgress.get(downloadId));
                        }
                    }
                    if (output.includes('[ExtractAudio]') || output.includes('[EmbedThumbnail]') || output.includes('[Metadata]')) {
                        console.log(`🔧 Post-processing detected, setting progress to 96%`);
                        this.downloadProgress.set(downloadId, {
                            id: downloadId,
                            status: 'processing',
                            progress: 96
                        });
                    }
                };
                ytdlpProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log(`📥 yt-dlp stdout: ${output.trim()}`);
                    parseOutput(output);
                });
                ytdlpProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    console.log(`📥 yt-dlp stderr: ${output.trim()}`);
                    parseOutput(output);
                });
                ytdlpProcess.on('close', async (code) => {
                    if (code === 0) {
                        console.log(`🎵 YTMusic: Download completed successfully`);
                        this.downloadProgress.set(downloadId, {
                            id: downloadId,
                            status: 'processing',
                            progress: 98
                        });
                        resolve();
                    }
                    else {
                        const finalPath = path_1.default.join(this.downloadsDir, `${videoId}.mp3`);
                        try {
                            const stats = await promises_1.default.stat(finalPath);
                            if (stats.size > 0) {
                                console.log(`🎵 YTMusic: File exists with size ${stats.size} bytes despite exit code ${code}, continuing...`);
                                this.downloadProgress.set(downloadId, {
                                    id: downloadId,
                                    status: 'processing',
                                    progress: 98
                                });
                                resolve();
                            }
                            else {
                                reject(new Error(`Download failed with exit code ${code}`));
                            }
                        }
                        catch {
                            reject(new Error(`Download failed with exit code ${code}`));
                        }
                    }
                });
                ytdlpProcess.on('error', (error) => {
                    console.error(`🎵 YTMusic: Process error:`, error);
                    reject(error);
                });
            });
            const finalPath = path_1.default.join(this.downloadsDir, `${videoId}.mp3`);
            console.log(`🎵 YTMusic: Download completed, file at: ${finalPath}`);
            await this.addDownloadedSongToDatabase(songInfo, finalPath, cleanTitle);
            this.downloadProgress.set(downloadId, {
                id: downloadId,
                status: 'completed',
                progress: 100
            });
        }
        catch (error) {
            console.error('Download error:', error);
            this.downloadProgress.set(downloadId, {
                id: downloadId,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Download failed'
            });
            throw error;
        }
    }
    async addDownloadedSongToDatabase(songInfo, filePath, cleanTitle) {
        try {
            let artworkPath = null;
            try {
                const metadata = await musicMetadata.parseFile(filePath);
                const picture = metadata.common.picture?.[0];
                if (picture) {
                    const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'artwork');
                    await promises_1.default.mkdir(uploadsDir, { recursive: true });
                    const artworkFilename = `yt_${songInfo.id}.jpg`;
                    artworkPath = path_1.default.join(uploadsDir, artworkFilename);
                    await (0, sharp_1.default)(picture.data)
                        .resize(500, 500, { fit: 'cover' })
                        .jpeg({ quality: 90 })
                        .toFile(artworkPath);
                    artworkPath = `uploads/artwork/${artworkFilename}`;
                    console.log(`🎨 Extracted artwork: ${artworkPath}`);
                }
            }
            catch (artworkError) {
                console.error('Error extracting artwork:', artworkError);
            }
            let artistName = 'Unknown Artist';
            if (songInfo.artist && typeof songInfo.artist === 'string') {
                artistName = songInfo.artist;
            }
            else if (songInfo.uploader && typeof songInfo.uploader === 'string') {
                artistName = songInfo.uploader;
            }
            else if (songInfo.channel && typeof songInfo.channel === 'string') {
                artistName = songInfo.channel;
            }
            else if (songInfo.uploader_id && typeof songInfo.uploader_id === 'string') {
                artistName = songInfo.uploader_id;
            }
            let artist = await Artist_1.default.findByName(artistName);
            if (!artist) {
                const artistData = {
                    name: artistName,
                    bio: null,
                    image_path: null
                };
                artist = await Artist_1.default.create(artistData);
            }
            let album = null;
            const albumTitle = songInfo.album || cleanTitle;
            if (albumTitle) {
                album = await Album_1.default.findByTitleAndArtist(albumTitle, artist.id);
                if (!album) {
                    const albumData = {
                        title: albumTitle,
                        artist_id: artist.id,
                        release_year: songInfo.release_year || null,
                        artwork_path: artworkPath
                    };
                    album = await Album_1.default.create(albumData);
                    console.log(`✅ Created album "${albumTitle}" with artwork for YouTube song`);
                }
                else if (artworkPath && !album.artwork_path) {
                    await Album_1.default.update(album.id, { artwork_path: artworkPath });
                    console.log(`✅ Updated album "${albumTitle}" with artwork`);
                }
            }
            const songData = {
                title: cleanTitle,
                artist_id: artist.id,
                album_id: album ? album.id : null,
                duration: songInfo.duration ? Math.floor(songInfo.duration) : null,
                file_path: filePath,
                genre: songInfo.genre || null,
                year: songInfo.release_year || songInfo.release_date?.substring(0, 4) || null,
                track_number: songInfo.track_number || null,
                source: 'youtube-music',
                youtube_id: songInfo.id
            };
            await Song_1.default.create(songData);
            console.log(`✅ Added downloaded song to database: "${cleanTitle}" by "${artist.name}" (YouTube ID: ${songInfo.id})`);
        }
        catch (error) {
            console.error('Error adding song to database:', error);
        }
    }
    getDownloadProgress(downloadId) {
        const progress = this.downloadProgress.get(downloadId) || null;
        return progress;
    }
    getAllActiveDownloads() {
        return Array.from(this.downloadProgress.values()).filter(progress => progress.status === 'downloading' || progress.status === 'processing');
    }
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
exports.default = new YTMusicService();
//# sourceMappingURL=ytMusicService.js.map