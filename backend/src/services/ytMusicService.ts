import ytdl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs/promises';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import * as musicMetadata from 'music-metadata';
import SongModel from '../models/Song';
import ArtistModel from '../models/Artist';
import AlbumModel from '../models/Album';

const execAsync = promisify(exec);

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

class YTMusicService {
  private downloadProgress: Map<string, DownloadProgress> = new Map();
  private downloadsDir: string;

  constructor() {
    this.downloadsDir = path.join(process.cwd(), 'yt-downloads');
    this.ensureDownloadDir();
  }

  private async ensureDownloadDir() {
    try {
      await fs.access(this.downloadsDir);
    } catch {
      await fs.mkdir(this.downloadsDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('YTMusic service initialized (using yt-dlp) // v3: real-time progress tracking');
  }

  async searchMusic(query: string): Promise<YTMusicSearchResult[]> {
    try {
      console.log(`🎵 YTMusic: Searching for "${query}" using yt-dlp...`);

      // Use yt-dlp to search YouTube
      const searchQuery = `ytsearch15:${query}`;
      const command = `yt-dlp "${searchQuery}" --flat-playlist -j --skip-download --no-warnings --quiet --no-progress`;

      const { stdout } = await execAsync(command);

      // Parse the JSON objects (one per line)
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      console.log(`🎵 YTMusic: Found ${lines.length} raw results from yt-dlp`);

      const ytMusicResults: YTMusicSearchResult[] = [];

      for (const line of lines) {
        try {
          const result = JSON.parse(line);

          // Check if song is already downloaded by YouTube ID
          const existingSong = await SongModel.findByYoutubeId(result.id);
          const isAvailable = !!existingSong;

          if (!isAvailable) {
            const artistName = result.uploader || result.channel || 'Unknown Artist';
            const title = result.title;

            // Skip if title matches artist name (likely a channel/artist page, not a song)
            if (title.toLowerCase().trim() === artistName.toLowerCase().trim()) {
              console.log(`🎵 YTMusic: Skipped "${title}" - title matches artist name (likely channel page)`);
              continue;
            }

            // Skip if title is just the artist name (another indicator of channel pages)
            if (title.toLowerCase().trim() === artistName.toLowerCase().trim()) {
              console.log(`🎵 YTMusic: Skipped "${title}" - appears to be channel page`);
              continue;
            }

            // Extract duration
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
          } else {
            console.log(`🎵 YTMusic: Skipped "${result.title}" - already downloaded (youtube_id: ${result.id})`);
          }
        } catch (parseError) {
          console.error('Error parsing yt-dlp result line:', parseError);
        }
      }

      console.log(`🎵 YTMusic: Returning ${ytMusicResults.length} unique results`);
      return ytMusicResults;
    } catch (error) {
      console.error('YTMusic search error:', error);
      return [];
    }
  }

  async downloadSong(videoId: string): Promise<string> {
    const downloadId = `${videoId}-${Date.now()}`;

    this.downloadProgress.set(downloadId, {
      id: downloadId,
      status: 'downloading',
      progress: 0
    });

    // Start download in background (don't await)
    this.performDownload(videoId, downloadId).catch(error => {
      console.error('Background download error:', error);
      this.downloadProgress.set(downloadId, {
        id: downloadId,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Download failed'
      });
    });

    // Return downloadId immediately so frontend can start polling
    return downloadId;
  }

  private async performDownload(videoId: string, downloadId: string): Promise<void> {
    try {
      console.log(`🎵 YTMusic: Starting download for video ID: ${videoId}`);

      // Get song info first using yt-dlp
      const infoCommand = `yt-dlp "https://www.youtube.com/watch?v=${videoId}" -j --no-warnings --quiet`;
      const { stdout: infoJson } = await execAsync(infoCommand);
      const songInfo = JSON.parse(infoJson);

      console.log(`🎵 YTMusic: Got song info:`, {
        title: songInfo.title,
        uploader: songInfo.uploader,
        duration: songInfo.duration
      });

      // Clean up the title - remove artist name and common suffixes
      let cleanTitle = songInfo.title || `video-${videoId}`;

      // Remove common patterns like "(Official Music Video)", "[Official Audio]", etc.
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

      // Remove artist name from beginning if present (e.g., "Artist Name - Song Title")
      let extractedArtistName = '';
      if (songInfo.artist && typeof songInfo.artist === 'string') {
        extractedArtistName = songInfo.artist;
      } else if (songInfo.uploader && typeof songInfo.uploader === 'string') {
        extractedArtistName = songInfo.uploader;
      } else if (songInfo.channel && typeof songInfo.channel === 'string') {
        extractedArtistName = songInfo.channel;
      }

      if (extractedArtistName && cleanTitle.toLowerCase().startsWith(extractedArtistName.toLowerCase() + ' - ')) {
        cleanTitle = cleanTitle.substring(extractedArtistName.length + 3);
      }

      cleanTitle = cleanTitle.trim();

      // Use YouTube video ID as filename for consistency
      const outputTemplate = path.join(this.downloadsDir, `${videoId}.%(ext)s`);

      this.downloadProgress.set(downloadId, {
        id: downloadId,
        status: 'downloading',
        progress: 0
      });

      console.log(`🎵 YTMusic: Starting download with real-time progress tracking...`);

      // Download the audio using yt-dlp with progress tracking
      await new Promise<void>((resolve, reject) => {
        const ytdlpProcess = spawn('yt-dlp', [
          `https://www.youtube.com/watch?v=${videoId}`,
          '-x',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '--embed-thumbnail',
          '--embed-metadata',
          '--add-metadata',
          '-o', outputTemplate,
          '--newline',  // Output progress on new lines for easier parsing
          '--progress',  // Force progress output
          '--no-warnings'
        ], {
          stdio: ['pipe', 'pipe', 'pipe']  // Ensure unbuffered I/O
        });

        let lastProgress = 0;

        const parseOutput = (output: string) => {
          // Parse progress from yt-dlp output
          // Format: [download]  45.2% of ~10.5MiB at 500KiB/s ETA 00:12
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

          // Detect post-processing phase
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

            // Set progress to 98% before database operations
            this.downloadProgress.set(downloadId, {
              id: downloadId,
              status: 'processing',
              progress: 98
            });

            resolve();
          } else {
            // Check if file was created despite error
            const finalPath = path.join(this.downloadsDir, `${videoId}.mp3`);
            try {
              const stats = await fs.stat(finalPath);
              if (stats.size > 0) {
                console.log(`🎵 YTMusic: File exists with size ${stats.size} bytes despite exit code ${code}, continuing...`);
                this.downloadProgress.set(downloadId, {
                  id: downloadId,
                  status: 'processing',
                  progress: 98
                });
                resolve();
              } else {
                reject(new Error(`Download failed with exit code ${code}`));
              }
            } catch {
              reject(new Error(`Download failed with exit code ${code}`));
            }
          }
        });

        ytdlpProcess.on('error', (error) => {
          console.error(`🎵 YTMusic: Process error:`, error);
          reject(error);
        });
      });

      const finalPath = path.join(this.downloadsDir, `${videoId}.mp3`);
      console.log(`🎵 YTMusic: Download completed, file at: ${finalPath}`);

      // Add to database with cleaned title (progress already at 98%)
      await this.addDownloadedSongToDatabase(songInfo, finalPath, cleanTitle);

      this.downloadProgress.set(downloadId, {
        id: downloadId,
        status: 'completed',
        progress: 100
      });
    } catch (error) {
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

  private async addDownloadedSongToDatabase(songInfo: any, filePath: string, cleanTitle: string) {
    try {
      // Extract artwork from the MP3 file
      let artworkPath: string | null = null;
      try {
        const metadata = await musicMetadata.parseFile(filePath);
        const picture = metadata.common.picture?.[0];

        if (picture) {
          // Create uploads/artwork directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'uploads', 'artwork');
          await fs.mkdir(uploadsDir, { recursive: true });

          // Save artwork with YouTube ID as filename
          const artworkFilename = `yt_${songInfo.id}.jpg`;
          artworkPath = path.join(uploadsDir, artworkFilename);

          // Convert and save artwork using sharp
          await sharp(picture.data)
            .resize(500, 500, { fit: 'cover' })
            .jpeg({ quality: 90 })
            .toFile(artworkPath);

          // Store relative path for database
          artworkPath = `uploads/artwork/${artworkFilename}`;
          console.log(`🎨 Extracted artwork: ${artworkPath}`);
        }
      } catch (artworkError) {
        console.error('Error extracting artwork:', artworkError);
      }

      // Create or get artist - extract string from potential object
      let artistName = 'Unknown Artist';
      if (songInfo.artist && typeof songInfo.artist === 'string') {
        artistName = songInfo.artist;
      } else if (songInfo.uploader && typeof songInfo.uploader === 'string') {
        artistName = songInfo.uploader;
      } else if (songInfo.channel && typeof songInfo.channel === 'string') {
        artistName = songInfo.channel;
      } else if (songInfo.uploader_id && typeof songInfo.uploader_id === 'string') {
        artistName = songInfo.uploader_id;
      }

      let artist = await ArtistModel.findByName(artistName);
      if (!artist) {
        const artistData = {
          name: artistName,
          bio: null,
          image_path: null
        };
        artist = await ArtistModel.create(artistData);
      }

      // Create or get album - always create an album for YouTube songs to display artwork
      let album = null;
      const albumTitle = songInfo.album || cleanTitle; // Use song title as album if no album metadata

      if (albumTitle) {
        album = await AlbumModel.findByTitleAndArtist(albumTitle, artist.id);
        if (!album) {
          const albumData = {
            title: albumTitle,
            artist_id: artist.id,
            release_year: songInfo.release_year || null,
            artwork_path: artworkPath  // Use extracted artwork for album
          };
          album = await AlbumModel.create(albumData);
          console.log(`✅ Created album "${albumTitle}" with artwork for YouTube song`);
        } else if (artworkPath && !album.artwork_path) {
          // Update album with artwork if it doesn't have one
          await AlbumModel.update(album.id, { artwork_path: artworkPath });
          console.log(`✅ Updated album "${albumTitle}" with artwork`);
        }
      }

      // Create song with YouTube ID and cleaned title
      const songData = {
        title: cleanTitle,  // Use cleaned title instead of original
        artist_id: artist.id,
        album_id: album ? album.id : null,
        duration: songInfo.duration ? Math.floor(songInfo.duration) : null,
        file_path: filePath,
        genre: songInfo.genre || null,
        year: songInfo.release_year || songInfo.release_date?.substring(0, 4) || null,
        track_number: songInfo.track_number || null,
        source: 'youtube-music' as const,
        youtube_id: songInfo.id  // Save YouTube video ID
      };

      await SongModel.create(songData);
      console.log(`✅ Added downloaded song to database: "${cleanTitle}" by "${artist.name}" (YouTube ID: ${songInfo.id})`);
    } catch (error) {
      console.error('Error adding song to database:', error);
    }
  }

  getDownloadProgress(downloadId: string): DownloadProgress | null {
    const progress = this.downloadProgress.get(downloadId) || null;
    return progress;
  }

  getAllActiveDownloads(): DownloadProgress[] {
    return Array.from(this.downloadProgress.values()).filter(
      progress => progress.status === 'downloading' || progress.status === 'processing'
    );
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export default new YTMusicService();