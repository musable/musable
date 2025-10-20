import Database from '../config/database';

export interface Artist {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ArtistWithStats extends Artist {
  song_count: number;
  album_count: number;
}

export class ArtistModel {
  private db = Database;

  async findByName(name: string): Promise<Artist | null> {
    return await this.db.get<Artist>(
      'SELECT * FROM artists WHERE name = ?',
      [name]
    );
  }

  async findById(id: number): Promise<Artist | null> {
    return await this.db.get<Artist>(
      'SELECT * FROM artists WHERE id = ?',
      [id]
    );
  }

  async create(name: string): Promise<Artist> {
    const result = await this.db.run(
      'INSERT INTO artists (name) VALUES (?)',
      [name]
    );

    const artist = await this.findById(result.lastID!);
    if (!artist) {
      throw new Error('Failed to create artist');
    }

    return artist;
  }

  async findOrCreate(name: string): Promise<Artist> {
    let artist = await this.findByName(name);
    
    if (!artist) {
      artist = await this.create(name);
    }

    return artist;
  }

  async getAllWithStats(): Promise<ArtistWithStats[]> {
    return await this.db.query<ArtistWithStats>(
      `SELECT 
        a.*,
        COUNT(DISTINCT s.id) as song_count,
        COUNT(DISTINCT al.id) as album_count
       FROM artists a
       LEFT JOIN songs s ON a.id = s.artist_id
       LEFT JOIN albums al ON a.id = al.artist_id
       GROUP BY a.id
       ORDER BY a.name`
    );
  }

  async search(query: string): Promise<Artist[]> {
    const searchTerm = `%${query}%`;
    return await this.db.query<Artist>(
      'SELECT * FROM artists WHERE name LIKE ? ORDER BY name',
      [searchTerm]
    );
  }

  async update(id: number, name: string): Promise<void> {
    await this.db.run(
      'UPDATE artists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, id]
    );
  }

  async delete(id: number): Promise<void> {
    await this.db.run('DELETE FROM artists WHERE id = ?', [id]);
  }

  async getArtistCount(): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM artists'
    );
    return result!.count;
  }
}

export default new ArtistModel();