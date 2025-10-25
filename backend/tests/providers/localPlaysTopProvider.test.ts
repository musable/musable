import { LocalPlaysTopProvider } from '../../src/providers/LocalPlaysTopProvider.js';
import { createMockDatabase } from '../__mocks__/database';

describe('LocalPlaysTopProvider', () => {
  const p = new LocalPlaysTopProvider();

  it('supports user tracks/artists/albums', () => {
    expect(
      p.supports({
        subjectType: 'user',
        subjectId: 1,
        itemType: 'track',
        scopeKey: 'all-time',
      }),
    ).toBe(true);
    expect(
      p.supports({
        subjectType: 'user',
        subjectId: 1,
        itemType: 'artist',
        scopeKey: '30d',
      }),
    ).toBe(true);
    expect(
      p.supports({
        subjectType: 'user',
        subjectId: 1,
        itemType: 'album',
        scopeKey: '30d',
      }),
    ).toBe(true);
    expect(
      p.supports({
        subjectType: 'artist',
        subjectId: 1,
        itemType: 'track',
        scopeKey: 'all-time',
      }),
    ).toBe(false);
  });

  test.each([['track'], ['artist'], ['album']])(
    'getTop returns items for %s',
    async (itemType) => {
      (p as any).db = createMockDatabase({
        query: jest.fn(async () => [{ title: 'X', plays: 3 }]),
      });
      const res = await p.getTop({
        subjectType: 'user',
        subjectId: 9,
        itemType: itemType as any,
        scopeKey: '30d',
        limit: 5,
      });
      expect(res.items[0].rank).toBe(1);
      expect(res.items[0].playcount).toBe(3);
    },
  );

  it('returns empty when userId missing', async () => {
    const res = await p.getTop({
      subjectType: 'user',
      itemType: 'track',
      scopeKey: 'all-time',
    } as any);
    expect(res.items).toEqual([]);
  });
});
