jest.mock('../../src/models/TopCache.js', () => ({
  __esModule: true,
  default: {
    findValidByKey: jest.fn(),
    upsert: jest.fn(async () => ({ id: 7 })),
  },
}));

jest.mock('../../src/models/TopItem.js', () => ({
  __esModule: true,
  default: {
    deleteByCacheId: jest.fn(),
    insertMany: jest.fn(),
    getByCacheId: jest.fn(),
  },
}));

jest.mock('../../src/models/Artist.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(async (id: number) => ({ id, name: 'Artist' })),
  },
}));

jest.mock('../../src/providers/LastFmTopProvider.js', () => ({
  __esModule: true,
  default: class MockLastFmProvider {
    public readonly name = 'lastfm';
    supports() {
      return true;
    }
    async getTop() {
      return { items: [{ rank: 1, title: 'T1' }] };
    }
  },
}));

jest.mock('../../src/providers/LocalPlaysTopProvider.js', () => ({
  __esModule: true,
  default: class MockLocalProvider {
    public readonly name = 'local-plays';
    supports() {
      return false;
    }
    async getTop() {
      return { items: [] };
    }
  },
}));

// Avoid DB access from topMatcher
jest.mock('../../src/services/topMatcher.js', () => ({
  __esModule: true,
  default: {
    matchTrackForArtist: jest.fn(async () => ({
      songId: 2,
      confidence: 0.99,
      method: 'mock',
    })),
  },
}));

import TopCacheModel from '../../src/models/TopCache.js';
import TopItemModel from '../../src/models/TopItem.js';

describe('TopService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached when valid and not forced', async () => {
    TopCacheModel.findValidByKey.mockResolvedValue({
      id: 9,
      scanned_at: 's',
      expires_at: 'e',
      status: 'success',
    });
    TopItemModel.getByCacheId.mockResolvedValue([
      { matched_song_id: 1 },
      { matched_song_id: null },
    ]);
    const { default: TopService } = await import(
      '../../src/services/topService.js'
    );
    const res = await TopService.getArtistTopTracksMatched(1, '30d', false, 10);
    expect(res.items).toEqual([{ matched_song_id: 1 }]);
  });

  it('refreshes via provider and persists', async () => {
    (
      TopCacheModel.findValidByKey as unknown as jest.Mock
    ).mockResolvedValueOnce(null);
    (TopCacheModel.upsert as unknown as jest.Mock).mockResolvedValue({ id: 7 });
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../../src/models/TopItem.js', () => ({
        __esModule: true,
        default: {
          deleteByCacheId: jest.fn(),
          insertMany: jest.fn(),
          getByCacheId: jest.fn(async () => [{ matched_song_id: 2 }]),
        },
      }));
      const { default: TopService } = await import(
        '../../src/services/topService.js'
      );
      const res = await TopService.getArtistTopTracksMatched(1, '30d', true, 5);
      const { default: TopItemModelIsolated } = await import(
        '../../src/models/TopItem.js'
      );
      const { default: TopCacheModelIsolated } = await import(
        '../../src/models/TopCache.js'
      );
      expect(TopCacheModelIsolated.upsert).toHaveBeenCalled();
      expect(TopItemModelIsolated.deleteByCacheId).toHaveBeenCalledWith(7);
      expect(TopItemModelIsolated.insertMany).toHaveBeenCalled();
      expect(res.items[0].matched_song_id).toBe(2);
    });
  });

  it('records failed status and rethrows on provider error', async () => {
    (
      TopCacheModel.findValidByKey as unknown as jest.Mock
    ).mockResolvedValueOnce(null);
    jest.resetModules();
    jest.doMock('../../src/providers/LastFmTopProvider.js', () => ({
      __esModule: true,
      default: class MockLastFmProvider {
        public readonly name = 'lastfm';
        supports() {
          return true;
        }
        async getTop() {
          throw new Error('boom');
        }
      },
    }));
    const { default: TopService } = await import(
      '../../src/services/topService.js'
    );
    await expect(
      TopService.getArtistTopTracksMatched(1, '30d', true, 5),
    ).rejects.toBeDefined();
    const TopCacheModelMock = (
      jest.requireMock('../../src/models/TopCache.js') as any
    ).default;
    expect(TopCacheModelMock.upsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      'failed',
      'boom',
    );
  });
});
