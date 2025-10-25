import Database from '../config/database.js';
import ArtistModel from '../models/Artist.js';
import TopCacheModel, { type TopCacheKey } from '../models/TopCache.js';
import TopItemModel, { type InsertTopItem } from '../models/TopItem.js';
import LastFmTopProvider from '../providers/LastFmTopProvider.js';
import LocalPlaysTopProvider from '../providers/LocalPlaysTopProvider.js';
import type { GetTopParams, TopProvider } from '../providers/TopProvider.js';
import topMatcher from './topMatcher.js';

const providers: TopProvider[] = [
  new LastFmTopProvider(process.env.LASTFM_API_KEY),
  new LocalPlaysTopProvider(),
];

const inFlightKeys = new Set<string>();

function makeKey(k: TopCacheKey): string {
  return [
    k.subject_type,
    k.subject_id ?? '',
    k.subject_value ?? '',
    k.item_type,
    k.provider,
    k.scope_key,
  ].join('|');
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export interface GetOrRefreshOptions {
  forceRefresh?: boolean;
  limit?: number;
}

export class TopService {
  private db = Database;

  private resolveProvider(params: GetTopParams): TopProvider | null {
    for (const p of providers) if (p.supports(params)) return p;
    return null;
  }

  async getArtistTopTracksMatched(
    artistId: number,
    scopeKey: string,
    forceRefresh = false,
    limit = 20,
  ) {
    const artist = await ArtistModel.findById(artistId);
    if (!artist) throw new Error('Artist not found');

    const key: TopCacheKey = {
      subject_type: 'artist',
      subject_id: artistId,
      subject_value: null,
      item_type: 'track',
      provider: 'lastfm',
      scope_key: scopeKey,
    };

    const nowIso = new Date().toISOString();
    const ttlDays = parseInt(process.env.TOPS_DEFAULT_TTL_DAYS || '30', 10);
    const providerParams: GetTopParams = {
      subjectType: 'artist',
      subjectId: artistId,
      subjectValue: artist.name, // pass artistName for Last.fm
      itemType: 'track',
      scopeKey,
      limit,
    };

    const provider = this.resolveProvider(providerParams);
    if (!provider) throw new Error('No provider supports the requested top');

    const k = makeKey(key);
    if (!forceRefresh) {
      const valid = await TopCacheModel.findValidByKey(key, nowIso);
      if (valid) {
        const items = await TopItemModel.getByCacheId(valid.id);
        return { cache: valid, items: items.filter((i) => i.matched_song_id) };
      }
    }

    if (inFlightKeys.has(k)) {
      // Simple guard: wait briefly and try reading cache again
      await new Promise((r) => setTimeout(r, 300));
      const valid = await TopCacheModel.findValidByKey(key, nowIso);
      if (valid) {
        const items = await TopItemModel.getByCacheId(valid.id);
        return { cache: valid, items: items.filter((i) => i.matched_song_id) };
      }
    }

    inFlightKeys.add(k);
    try {
      const scannedAt = new Date();
      const expiresAt = addDays(scannedAt, ttlDays);
      const scannedAtIso = scannedAt.toISOString();
      const expiresAtIso = expiresAt.toISOString();

      const result = await provider.getTop(providerParams);

      const cache = await TopCacheModel.upsert(
        key,
        scannedAtIso,
        expiresAtIso,
        'success',
      );
      // Rebuild items
      await TopItemModel.deleteByCacheId(cache.id);

      const inserts: InsertTopItem[] = [];
      for (const it of result.items.slice(0, limit)) {
        const match = await topMatcher.matchTrackForArtist(
          artistId,
          it.title || '',
          it.duration,
        );
        inserts.push({
          cache_id: cache.id,
          subject_type: 'artist',
          subject_id: artistId,
          subject_value: null,
          item_type: 'track',
          rank: it.rank,
          title: it.title || null,
          external_id: it.externalId || null,
          playcount: it.playcount ?? null,
          listeners: it.listeners ?? null,
          score: it.score ?? null,
          url: it.url ?? null,
          duration: it.duration ?? null,
          matched_song_id: match.songId ?? null,
          match_confidence: match.confidence,
          match_method: match.method,
        });
      }

      await this.db.transaction(async () => {
        await TopItemModel.insertMany(inserts);
      });

      const items = await TopItemModel.getByCacheId(cache.id);
      return { cache, items: items.filter((i) => i.matched_song_id) };
    } catch (err: unknown) {
      const scannedAtIso = new Date().toISOString();
      const expiresAtIso = addDays(
        new Date(),
        parseInt(process.env.TOPS_DEFAULT_TTL_DAYS || '30', 10),
      ).toISOString();
      await TopCacheModel.upsert(
        key,
        scannedAtIso,
        expiresAtIso,
        'failed',
        err instanceof Error ? err.message : 'provider error',
      );
      throw err;
    } finally {
      inFlightKeys.delete(k);
    }
  }
}

export default new TopService();
