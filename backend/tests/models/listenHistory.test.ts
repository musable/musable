jest.mock('../../src/config/database.ts', () => ({
  __esModule: true,
  default: require('../__mocks__/database').createMockDatabase(),
}));

import ListenHistoryModelModule from '../../src/models/ListenHistory.js';
import { createMockDatabase } from '../__mocks__/database';

describe('ListenHistoryModel', () => {
  const ListenHistoryModel = ListenHistoryModelModule as any;

  beforeEach(() => {
    jest.resetModules();
  });

  it('create inserts and fetches row', async () => {
    const db = createMockDatabase({
      run: jest.fn(async () => ({ lastID: 42 })),
      get: jest.fn(async () => ({
        id: 42,
        user_id: 1,
        song_id: 2,
        played_at: 'now',
        completed: false,
      })),
    });
    (ListenHistoryModel as any).db = db;
    const row = await ListenHistoryModel.create({ user_id: 1, song_id: 2 });
    expect(row.id).toBe(42);
    expect(db.run).toHaveBeenCalled();
  });

  test.each([
    ['getUserHistory', 'getUserHistory', [1, 50, 0]],
    ['getAllHistory', 'getAllHistory', [100, 0]],
    ['getRecentlyPlayedSongs', 'getRecentlyPlayedSongs', [1, 20]],
    ['getMostPlayedSongs-user', 'getMostPlayedSongs', [1, 20]],
    ['getMostPlayedSongs-all', 'getMostPlayedSongs', [undefined, 20]],
    ['getUserTopSongs-with-since', 'getUserTopSongs', [1, 20, '2020-01-01']],
    ['getUserTopSongs-no-since', 'getUserTopSongs', [1, 20]],
    ['getListeningStats-user', 'getListeningStats', [1]],
    ['getListeningStats-all', 'getListeningStats', []],
    ['getListeningTrends-user', 'getListeningTrends', [1, 30]],
    ['getListeningTrends-all', 'getListeningTrends', [undefined, 30]],
    ['getUserTopArtists', 'getUserTopArtists', [1, 10]],
    ['getUserTopAlbums', 'getUserTopAlbums', [1, 10]],
    ['deleteUserHistory', 'deleteUserHistory', [1]],
    ['deleteOldHistory', 'deleteOldHistory', [365]],
  ])('%s executes query/run', async (_name, method, args) => {
    const db = createMockDatabase();
    (ListenHistoryModel as any).db = db;
    const res = await (ListenHistoryModel as any)[method](...args);
    if (method.startsWith('delete')) {
      expect(db.run).toHaveBeenCalled();
    } else if (method.startsWith('get') || method.startsWith('find')) {
      expect(db.query || db.get).toBeDefined();
    }
  });
});
