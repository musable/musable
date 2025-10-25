import Database from '../config/database.js';
import type {
  GetTopParams,
  TopProvider,
  TopProviderResult,
} from './TopProvider.js';

function parseScopeToWindow(scopeKey: string): { sinceSql?: string } {
  // Supports '7d', '30d', '90d', 'year:YYYY', 'all-time'
  if (scopeKey === 'all-time') return {};
  const now = new Date();
  if (scopeKey.endsWith('d')) {
    const days = parseInt(scopeKey.slice(0, -1), 10);
    const since = new Date(now.getTime() - days * 24 * 3600 * 1000);
    return { sinceSql: since.toISOString() };
  }
  if (scopeKey.startsWith('year:')) {
    const year = parseInt(scopeKey.split(':')[1], 10);
    const since = new Date(Date.UTC(year, 0, 1));
    return { sinceSql: since.toISOString() };
  }
  return {};
}

export class LocalPlaysTopProvider implements TopProvider {
  public readonly name = 'local-plays';
  private db = Database;

  supports(params: GetTopParams): boolean {
    // Support user tops: tracks, artists, albums
    return (
      params.subjectType === 'user' &&
      ['track', 'artist', 'album'].includes(params.itemType)
    );
  }

  async getTop(params: GetTopParams): Promise<TopProviderResult> {
    const userId = params.subjectId ?? null;
    if (userId === null) {
      return { items: [] };
    }
    const { sinceSql } = parseScopeToWindow(params.scopeKey);
    const limit = params.limit ?? 50;

    if (params.itemType === 'track') {
      interface TrackRow {
        title: string;
        plays: number;
      }
      const rows = await this.db.query<TrackRow>(
        `SELECT s.id as song_id, s.title, a.name as artist_name, COUNT(*) as plays
         FROM listen_history lh
         JOIN songs s ON lh.song_id = s.id
         JOIN artists a ON s.artist_id = a.id
         WHERE lh.user_id = ? ${sinceSql ? 'AND lh.played_at >= ?' : ''}
         GROUP BY s.id
         ORDER BY plays DESC
         LIMIT ?`,
        sinceSql ? [userId, sinceSql, limit] : [userId, limit],
      );
      return {
        items: rows.map((r, idx: number) => ({
          rank: idx + 1,
          title: r.title,
          playcount: Number(r.plays),
        })),
      };
    }

    if (params.itemType === 'artist') {
      interface ArtistRow {
        name: string;
        plays: number;
      }
      const rows = await this.db.query<ArtistRow>(
        `SELECT a.id as artist_id, a.name, COUNT(*) as plays
         FROM listen_history lh
         JOIN songs s ON lh.song_id = s.id
         JOIN artists a ON s.artist_id = a.id
         WHERE lh.user_id = ? ${sinceSql ? 'AND lh.played_at >= ?' : ''}
         GROUP BY a.id
         ORDER BY plays DESC
         LIMIT ?`,
        sinceSql ? [userId, sinceSql, limit] : [userId, limit],
      );
      return {
        items: rows.map((r, idx: number) => ({
          rank: idx + 1,
          title: r.name,
          playcount: Number(r.plays),
        })),
      };
    }

    if (params.itemType === 'album') {
      interface AlbumRow {
        title: string;
        plays: number;
      }
      const rows = await this.db.query<AlbumRow>(
        `SELECT al.id as album_id, al.title, COUNT(*) as plays
         FROM listen_history lh
         JOIN songs s ON lh.song_id = s.id
         JOIN albums al ON s.album_id = al.id
         WHERE lh.user_id = ? ${sinceSql ? 'AND lh.played_at >= ?' : ''}
         GROUP BY al.id
         ORDER BY plays DESC
         LIMIT ?`,
        sinceSql ? [userId, sinceSql, limit] : [userId, limit],
      );
      return {
        items: rows.map((r, idx: number) => ({
          rank: idx + 1,
          title: r.title,
          playcount: Number(r.plays),
        })),
      };
    }

    return { items: [] };
  }
}

export default LocalPlaysTopProvider;
