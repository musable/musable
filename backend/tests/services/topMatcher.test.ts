import { TopMatcher } from '../../src/services/topMatcher.js';
import { createMockDatabase } from '../__mocks__/database';

describe('TopMatcher', () => {
  const matcher = new TopMatcher();

  it('matches exact normalized title and boosts with duration', async () => {
    (matcher as any).db = createMockDatabase({
      query: jest.fn(async () => [
        { id: 1, title: 'Song (feat. X)', duration: 200 },
        { id: 2, title: 'Other', duration: 210 },
      ]),
    });
    const r1 = await matcher.matchTrackForArtist(3, 'Song', 200);
    expect(r1.songId).toBe(1);
    expect(r1.confidence).toBeGreaterThan(0.95);

    const r2 = await matcher.matchTrackForArtist(3, 'Song', 203);
    expect(r2.songId).toBe(1);
    expect(r2.confidence).toBeGreaterThan(0.95);
  });

  it('falls back to prefix when no exact', async () => {
    (matcher as any).db = createMockDatabase({
      query: jest.fn(async () => [
        { id: 1, title: 'Long Song Title', duration: 100 },
      ]),
    });
    const r = await matcher.matchTrackForArtist(3, 'Long Song', 104);
    expect(r.songId).toBe(1);
    expect(r.confidence).toBeGreaterThan(0.6);
  });

  it('returns no-match when nothing suitable', async () => {
    (matcher as any).db = createMockDatabase({
      query: jest.fn(async () => [{ id: 1, title: 'X' }]),
    });
    const r = await matcher.matchTrackForArtist(3, 'Y');
    expect(r.songId).toBeUndefined();
    expect(r.confidence).toBe(0);
  });
});
