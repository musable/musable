import Database from '../config/database.js';

export interface Album {
  id: number;
  title: string;
  artist_id: number;
  release_year?: number;
  artwork_path?: string;
  created_at: string;
  updated_at: string;
}

export interface AlbumWithDetails extends Album {
  artist_name: string;
  song_count: number;
  total_duration: number;
}

export interface CreateAlbumData {
  title: string;
  artist_id: number;
  release_year?: number;
  artwork_path?: string;
}

export class AlbumModel {
  private db = Database;

  async findById(id: number): Promise<Album | null> {
    return await this.db.get<Album>('SELECT * FROM albums WHERE id = ?', [id]);
  }

  async findByTitleAndArtist(
    title: string,
    artistId: number,
  ): Promise<Album | null> {
    return await this.db.get<Album>(
      'SELECT * FROM albums WHERE title = ? AND artist_id = ?',
      [title, artistId],
    );
  }

  async create(albumData: CreateAlbumData): Promise<Album> {
    const result = await this.db.run(
      'INSERT INTO albums (title, artist_id, release_year, artwork_path) VALUES (?, ?, ?, ?)',
      [
        albumData.title,
        albumData.artist_id,
        albumData.release_year || null,
        albumData.artwork_path || null,
      ],
    );

    const album = await this.findById(result.lastID!);
    if (!album) {
      throw new Error('Failed to create album');
    }

    return album;
  }

  async findOrCreate(
    title: string,
    artistId: number,
    releaseYear?: number,
  ): Promise<Album> {
    let album = await this.findByTitleAndArtist(title, artistId);

    if (!album) {
      album = await this.create({
        title,
        artist_id: artistId,
        release_year: releaseYear,
      });
    }

    return album;
  }

  async findWithDetails(id: number): Promise<AlbumWithDetails | null> {
    return await this.db.get<AlbumWithDetails>(
      `SELECT
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       WHERE al.id = ?
       GROUP BY al.id`,
      [id],
    );
  }

  async getAllWithDetails(): Promise<AlbumWithDetails[]> {
    return await this.db.query<AlbumWithDetails>(
      `SELECT
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       GROUP BY al.id
       ORDER BY a.name, al.title`,
    );
  }

  async getAlbumsByArtist(artistId: number): Promise<AlbumWithDetails[]> {
    return await this.db.query<AlbumWithDetails>(
      `SELECT
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       WHERE al.artist_id = ?
       GROUP BY al.id
       ORDER BY al.release_year DESC, al.title`,
      [artistId],
    );
  }

  async search(query: string): Promise<AlbumWithDetails[]> {
    const searchTerm = `%${query}%`;
    return await this.db.query<AlbumWithDetails>(
      `SELECT
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       WHERE al.title LIKE ? OR a.name LIKE ?
       GROUP BY al.id
       ORDER BY a.name, al.title`,
      [searchTerm, searchTerm],
    );
  }

  async updateArtwork(id: number, artworkPath: string): Promise<void> {
    await this.db.run(
      'UPDATE albums SET artwork_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [artworkPath, id],
    );
  }

  async update(id: number, updates: Partial<CreateAlbumData>): Promise<void> {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates);
    values.push(id);

    await this.db.run(
      `UPDATE albums SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
    );
  }

  async delete(id: number): Promise<void> {
    await this.db.run('DELETE FROM albums WHERE id = ?', [id]);
  }

  async getAlbumCount(): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM albums',
    );
    return result!.count;
  }

  async getRecentAlbums(limit: number = 20): Promise<AlbumWithDetails[]> {
    return await this.db.query<AlbumWithDetails>(
      `SELECT
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       GROUP BY al.id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [limit],
    );
  }
}

export default new AlbumModel();
