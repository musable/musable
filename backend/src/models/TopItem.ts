import Database from '../config/database.js';
import type { ItemType, SubjectType } from './TopCache.js';

export interface TopItemRecord {
  id: number;
  cache_id: number;
  subject_type: SubjectType;
  subject_id?: number | null;
  subject_value?: string | null;
  item_type: ItemType;
  rank: number;
  title?: string | null;
  external_id?: string | null;
  playcount?: number | null;
  listeners?: number | null;
  score?: number | null;
  url?: string | null;
  duration?: number | null;
  matched_song_id?: number | null;
  matched_artist_id?: number | null;
  matched_album_id?: number | null;
  match_confidence?: number | null;
  match_method?: string | null;
  created_at: string;
}

export interface InsertTopItem {
  cache_id: number;
  subject_type: SubjectType;
  subject_id?: number | null;
  subject_value?: string | null;
  item_type: ItemType;
  rank: number;
  title?: string | null;
  external_id?: string | null;
  playcount?: number | null;
  listeners?: number | null;
  score?: number | null;
  url?: string | null;
  duration?: number | null;
  matched_song_id?: number | null;
  matched_artist_id?: number | null;
  matched_album_id?: number | null;
  match_confidence?: number | null;
  match_method?: string | null;
}

export class TopItemModel {
  private db = Database;

  async deleteByCacheId(cacheId: number): Promise<void> {
    await this.db.run('DELETE FROM top_items WHERE cache_id = ?', [cacheId]);
  }

  async insertMany(items: InsertTopItem[]): Promise<void> {
    for (const item of items) {
      await this.db.run(
        `INSERT INTO top_items (
          cache_id, subject_type, subject_id, subject_value, item_type, rank,
          title, external_id, playcount, listeners, score, url, duration,
          matched_song_id, matched_artist_id, matched_album_id,
          match_confidence, match_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.cache_id,
          item.subject_type,
          item.subject_id ?? null,
          item.subject_value ?? null,
          item.item_type,
          item.rank,
          item.title ?? null,
          item.external_id ?? null,
          item.playcount ?? null,
          item.listeners ?? null,
          item.score ?? null,
          item.url ?? null,
          item.duration ?? null,
          item.matched_song_id ?? null,
          item.matched_artist_id ?? null,
          item.matched_album_id ?? null,
          item.match_confidence ?? null,
          item.match_method ?? null,
        ],
      );
    }
  }

  async getByCacheId(cacheId: number): Promise<TopItemRecord[]> {
    return await this.db.query<TopItemRecord>(
      'SELECT * FROM top_items WHERE cache_id = ? ORDER BY rank ASC',
      [cacheId],
    );
  }
}

export default new TopItemModel();
