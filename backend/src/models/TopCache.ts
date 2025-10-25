import Database from '../config/database.js';

export type SubjectType = 'artist' | 'user' | 'tag' | 'genre';
export type ItemType = 'track' | 'artist' | 'album' | 'tag' | 'genre';

export interface TopCacheRecord {
  id: number;
  subject_type: SubjectType;
  subject_id?: number | null;
  subject_value?: string | null;
  item_type: ItemType;
  provider: string;
  scope_key: string;
  scanned_at: string;
  expires_at: string;
  status: 'success' | 'failed';
  error_message?: string | null;
}

export interface TopCacheKey {
  subject_type: SubjectType;
  subject_id?: number | null;
  subject_value?: string | null;
  item_type: ItemType;
  provider: string;
  scope_key: string;
}

export class TopCacheModel {
  private db = Database;

  async findByKey(key: TopCacheKey): Promise<TopCacheRecord | null> {
    const {
      subject_type,
      subject_id = null,
      subject_value = null,
      item_type,
      provider,
      scope_key,
    } = key;
    return await this.db.get<TopCacheRecord>(
      `SELECT * FROM top_cache
       WHERE subject_type = ?
         AND COALESCE(subject_id, 0) = COALESCE(?, 0)
         AND COALESCE(subject_value, '') = COALESCE(?, '')
         AND item_type = ?
         AND provider = ?
         AND scope_key = ?`,
      [subject_type, subject_id, subject_value, item_type, provider, scope_key],
    );
  }

  async findValidByKey(
    key: TopCacheKey,
    nowIso: string,
  ): Promise<TopCacheRecord | null> {
    const cache = await this.findByKey(key);
    if (!cache) return null;
    if (new Date(cache.expires_at).getTime() <= new Date(nowIso).getTime())
      return null;
    if (cache.status !== 'success') return null;
    return cache;
  }

  async upsert(
    key: TopCacheKey,
    scannedAtIso: string,
    expiresAtIso: string,
    status: 'success' | 'failed',
    errorMessage?: string | null,
  ): Promise<TopCacheRecord> {
    const existing = await this.findByKey(key);
    if (existing) {
      await this.db.run(
        `UPDATE top_cache SET scanned_at = ?, expires_at = ?, status = ?, error_message = ?
         WHERE id = ?`,
        [scannedAtIso, expiresAtIso, status, errorMessage || null, existing.id],
      );
      const updated = await this.db.get<TopCacheRecord>(
        'SELECT * FROM top_cache WHERE id = ?',
        [existing.id],
      );
      if (!updated) throw new Error('Failed to update top_cache');
      return updated;
    }

    const result = await this.db.run(
      `INSERT INTO top_cache (
        subject_type, subject_id, subject_value, item_type, provider, scope_key,
        scanned_at, expires_at, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        key.subject_type,
        key.subject_id ?? null,
        key.subject_value ?? null,
        key.item_type,
        key.provider,
        key.scope_key,
        scannedAtIso,
        expiresAtIso,
        status,
        errorMessage || null,
      ],
    );
    const created = await this.db.get<TopCacheRecord>(
      'SELECT * FROM top_cache WHERE id = ?',
      [result.lastID],
    );
    if (!created) throw new Error('Failed to create top_cache');
    return created;
  }

  async deleteById(cacheId: number): Promise<void> {
    await this.db.run('DELETE FROM top_cache WHERE id = ?', [cacheId]);
  }
}

export default new TopCacheModel();
