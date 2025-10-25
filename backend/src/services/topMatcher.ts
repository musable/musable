import Database from '../config/database.js';

function normalizeTitle(title?: string): string {
  if (!title) return '';
  let t = title.toLowerCase();
  t = t.replace(/\s*\([^)]*\)/g, ''); // remove parentheses content
  t = t.replace(/\s*\[[^\]]*\]/g, ''); // remove brackets content
  t = t.replace(/\s+feat\..*$/g, ''); // remove feat.
  t = t.replace(/[^a-z0-9\s]/g, ''); // strip punctuation
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export interface TrackCandidate {
  id: number;
  title: string;
  duration?: number | null;
}

export interface MatchResult {
  songId?: number;
  confidence: number;
  method: string;
}

export class TopMatcher {
  private db = Database;

  async matchTrackForArtist(
    artistId: number,
    title: string,
    duration?: number,
  ): Promise<MatchResult> {
    const norm = normalizeTitle(title);
    const candidates = await this.db.query<TrackCandidate>(
      'SELECT id, title, duration FROM songs WHERE artist_id = ?',
      [artistId],
    );

    let best: { songId: number; confidence: number; method: string } | null =
      null;
    for (const c of candidates) {
      const nt = normalizeTitle(c.title);
      if (nt === norm) {
        let conf = 0.9;
        let method = 'title-exact';
        if (duration && c.duration) {
          const diff = Math.abs(c.duration - duration);
          if (diff <= 2) {
            conf = 0.99;
            method = 'title-exact+duration-2s';
          } else if (diff <= 5) {
            conf = 0.96;
            method = 'title-exact+duration-5s';
          }
        }
        best =
          !best || conf > best.confidence
            ? { songId: c.id, confidence: conf, method }
            : best;
      }
    }

    if (best) return best;

    // Fallback: startswith match
    for (const c of candidates) {
      const nt = normalizeTitle(c.title);
      if (nt.startsWith(norm) || norm.startsWith(nt)) {
        let conf = 0.6;
        let method = 'title-prefix';
        if (duration && c.duration) {
          const diff = Math.abs(c.duration - duration);
          if (diff <= 2) {
            conf = 0.8;
            method = 'title-prefix+duration-2s';
          } else if (diff <= 5) {
            conf = 0.7;
            method = 'title-prefix+duration-5s';
          }
        }
        if (!best || conf > best.confidence)
          best = { songId: c.id, confidence: conf, method };
      }
    }

    return best || { songId: undefined, confidence: 0, method: 'no-match' };
  }
}

export default new TopMatcher();
