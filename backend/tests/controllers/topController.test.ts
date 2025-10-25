import { createMockReq, createMockRes } from '../utils/express';

jest.mock('../../src/services/topService.ts', () => ({
  __esModule: true,
  default: {
    getArtistTopTracksMatched: jest.fn(),
  },
}));

jest.mock('../../src/models/ListenHistory.ts', () => ({
  __esModule: true,
  default: {
    getUserTopSongs: jest.fn(),
  },
}));

import * as ctrl from '../../src/controllers/topController.js';
import ListenHistoryModel from '../../src/models/ListenHistory.js';
import topService from '../../src/services/topService.js';

describe('topController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    { id: '123', scope: 'all-time', limit: '20', forceRefresh: 'false' },
    { id: '5', scope: '30d', limit: '10', forceRefresh: 'true' },
  ])(
    'getArtistTopTracks returns data ($id, $scope)',
    async ({ id, scope, limit, forceRefresh }) => {
      const req = createMockReq({
        params: { id },
        query: { scope, limit, forceRefresh },
      });
      const res = createMockRes();

      const result = {
        cache: {
          scanned_at: '2024-01-01T00:00:00Z',
          expires_at: '2024-02-01T00:00:00Z',
        },
        items: [{ matched_song_id: 1 }],
      };
      (
        topService.getArtistTopTracksMatched as unknown as jest.Mock
      ).mockResolvedValue(result);

      await ctrl.getArtistTopTracks(req as any, res as any, jest.fn());
      expect(topService.getArtistTopTracksMatched).toHaveBeenCalledWith(
        parseInt(id, 10),
        scope,
        forceRefresh === 'true',
        parseInt(limit, 10),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ scope }),
        }),
      );
    },
  );

  it('getArtistTopTracks validates id', async () => {
    const req = createMockReq({ params: { id: 'NaN' }, query: {} });
    const res = createMockRes();
    const next = jest.fn();
    await ctrl.getArtistTopTracks(req as any, res as any, next as any);
    expect(next).toHaveBeenCalled();
  });

  it('refreshArtistTopTracks forces refresh', async () => {
    const req = createMockReq({
      params: { id: '7' },
      query: { scope: 'all-time', limit: '15' },
    });
    const res = createMockRes();
    (
      topService.getArtistTopTracksMatched as unknown as jest.Mock
    ).mockResolvedValue({
      cache: {
        scanned_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-02-01T00:00:00Z',
      },
      items: [],
    });
    await ctrl.refreshArtistTopTracks(req as any, res as any, jest.fn());
    expect(topService.getArtistTopTracksMatched).toHaveBeenCalledWith(
      7,
      'all-time',
      true,
      15,
    );
  });

  test.each([
    {
      subjectType: 'artist',
      subjectId: '3',
      itemType: 'track',
      scope: '30d',
      provider: 'lastfm',
      limit: '5',
      forceRefresh: 'false',
    },
  ])('getTops routes to service when supported', async (query) => {
    const req = createMockReq({ query });
    const res = createMockRes();
    (
      topService.getArtistTopTracksMatched as unknown as jest.Mock
    ).mockResolvedValue({
      cache: {
        scanned_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-02-01T00:00:00Z',
      },
      items: [{ matched_song_id: 2 }],
    });
    await ctrl.getTops(req as any, res as any, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('getMyTops requires auth and supports only track', async () => {
    const req1 = createMockReq({
      params: { itemType: 'album' },
      user: { id: 9 } as any,
    });
    const res1 = createMockRes();
    await ctrl.getMyTops(req1 as any, res1 as any, jest.fn());
    expect(res1.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );

    const req2 = createMockReq({
      params: { itemType: 'track' },
      query: { scope: '30d', limit: '10' },
      user: { id: 4 } as any,
    });
    const res2 = createMockRes();
    (
      ListenHistoryModel.getUserTopSongs as unknown as jest.Mock
    ).mockResolvedValue([
      {
        id: 1,
        title: 't',
        artist_name: 'a',
        album_title: null,
        artwork_path: null,
        play_count: 3,
      },
    ]);
    await ctrl.getMyTops(req2 as any, res2 as any, jest.fn());
    expect(ListenHistoryModel.getUserTopSongs).toHaveBeenCalledWith(
      4,
      10,
      expect.any(String),
    );
  });
});
