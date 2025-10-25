jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import axios from 'axios';
import { LastFmTopProvider } from '../../src/providers/LastFmTopProvider.js';

describe('LastFmTopProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('supports only artist top tracks', () => {
    const p = new LastFmTopProvider('k');
    expect(
      p.supports({
        subjectType: 'artist',
        subjectId: 1,
        itemType: 'track',
        scopeKey: 'all-time',
      }),
    ).toBe(true);
    expect(
      p.supports({
        subjectType: 'user',
        subjectId: 1,
        itemType: 'track',
        scopeKey: 'all-time',
      }),
    ).toBe(false);
  });

  it('returns empty when apiKey missing or artistName missing', async () => {
    const pNoKey = new LastFmTopProvider();
    await expect(
      pNoKey.getTop({
        subjectType: 'artist',
        subjectId: 1,
        itemType: 'track',
        scopeKey: 'all-time',
      }),
    ).resolves.toEqual({ items: [] });
    const p = new LastFmTopProvider('k');
    await expect(
      p.getTop({
        subjectType: 'artist',
        subjectId: 1,
        itemType: 'track',
        scopeKey: 'all-time',
      }),
    ).resolves.toEqual({ items: [] });
  });

  it('maps response to normalized items', async () => {
    const p = new LastFmTopProvider('k');
    (axios.get as unknown as jest.Mock).mockResolvedValue({
      data: {
        toptracks: {
          track: [
            {
              name: 'Song A',
              url: 'u',
              playcount: '10',
              listeners: '5',
              '@attr': { rank: '1' },
            },
            { name: 'Song B', url: 'u2', listeners: 2 },
          ],
        },
      },
    });
    const res = await p.getTop({
      subjectType: 'artist',
      subjectId: 1,
      subjectValue: 'Artist',
      itemType: 'track',
      scopeKey: 'all-time',
      limit: 2,
    });
    expect(res.items.length).toBe(2);
    expect(res.items[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        title: 'Song A',
        playcount: 10,
        listeners: 5,
      }),
    );
  });
});
