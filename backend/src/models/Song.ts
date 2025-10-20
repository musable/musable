import Database from '../config/database';

export interface Song {
  id: number;
  title: string;
  artist_id: number;
  album_id?: number;
  file_path: string;
  file_size?: number;
  duration?: number;
  track_number?: number;
  genre?: string;
  year?: number;
  bitrate?: number;
  sample_rate?: number;
  source: 'local' | 'youtube' | 'youtube-music';
  youtube_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SongWithDetails extends Song {
  artist_name: string;
  album_title?: string;
  artwork_path?: string;
}

export interface CreateSongData {
  title: string;
  artist_id: number;
  album_id?: number;
  file_path: string;
  file_size?: number;
  duration?: number;
  track_number?: number;
  genre?: string;
  year?: number;
  bitrate?: number;
  sample_rate?: number;
  source?: 'local' | 'youtube' | 'youtube-music';
  youtube_id?: string;
}

export class SongModel {
  private db = Database;

  async create(songData: CreateSongData): Promise<Song> {
    const result = await this.db.run(
      `INSERT INTO songs (
        title, artist_id, album_id, file_path, file_size, duration,
        track_number, genre, year, bitrate, sample_rate, source, youtube_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        songData.title,
        songData.artist_id,
        songData.album_id || null,
        songData.file_path,
        songData.file_size || null,
        songData.duration || null,
        songData.track_number || null,
        songData.genre || null,
        songData.year || null,
        songData.bitrate || null,
        songData.sample_rate || null,
        songData.source || 'local',
        songData.youtube_id || null
      ]
    );

    const song = await this.findById(result.lastID!);
    if (!song) {
      throw new Error('Failed to create song');
    }

    return song;
  }

  async findById(id: number): Promise<Song | null> {
    return await this.db.get<Song>(
      'SELECT * FROM songs WHERE id = ?',
      [id]
    );
  }

  async findByPath(filePath: string): Promise<Song | null> {
    return await this.db.get<Song>(
      'SELECT * FROM songs WHERE file_path = ?',
      [filePath]
    );
  }

  async findByYoutubeId(youtubeId: string): Promise<Song | null> {
    return await this.db.get<Song>(
      'SELECT * FROM songs WHERE youtube_id = ?',
      [youtubeId]
    );
  }

  async findWithDetails(id: number): Promise<SongWithDetails | null> {
    return await this.db.get<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.id = ?`,
      [id]
    );
  }

  async getAllWithDetails(): Promise<SongWithDetails[]> {
    return await this.db.query<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       ORDER BY a.name, al.title, s.track_number, s.title`
    );
  }

  async searchSongs(query: string): Promise<SongWithDetails[]> {
    const searchTerm = `%${query}%`;
    return await this.db.query<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.title LIKE ? 
          OR a.name LIKE ? 
          OR al.title LIKE ?
          OR s.genre LIKE ?
       ORDER BY a.name, al.title, s.track_number, s.title`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
  }

  async getSongsByArtist(artistId: number): Promise<SongWithDetails[]> {
    return await this.db.query<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.artist_id = ?
       ORDER BY al.title, s.track_number, s.title`,
      [artistId]
    );
  }

  async getSongsByAlbum(albumId: number): Promise<SongWithDetails[]> {
    return await this.db.query<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.album_id = ?
       ORDER BY s.track_number, s.title`,
      [albumId]
    );
  }

  async updateSong(id: number, updates: Partial<CreateSongData>): Promise<void> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    await this.db.run(
      `UPDATE songs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }

  async deleteSong(id: number): Promise<void> {
    await this.db.run('DELETE FROM songs WHERE id = ?', [id]);
  }

  async getSongCount(): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM songs'
    );
    return result!.count;
  }

  async getTotalDuration(): Promise<number> {
    const result = await this.db.get<{ total: number }>(
      'SELECT SUM(duration) as total FROM songs WHERE duration IS NOT NULL'
    );
    return result!.total || 0;
  }

  async getGenres(): Promise<string[]> {
    const result = await this.db.query<{ genre: string }>(
      'SELECT DISTINCT genre FROM songs WHERE genre IS NOT NULL ORDER BY genre'
    );
    return result.map(r => r.genre);
  }

  async getSongsByGenre(genre: string): Promise<SongWithDetails[]> {
    return await this.db.query<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.genre = ?
       ORDER BY a.name, al.title, s.track_number, s.title`,
      [genre]
    );
  }

  async getRandomSongs(limit: number = 50): Promise<SongWithDetails[]> {
    return await this.db.query<SongWithDetails>(
      `SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       ORDER BY RANDOM()
       LIMIT ?`,
      [limit]
    );
  }
}

export default new SongModel();