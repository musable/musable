import TopCacheModelModule from '../../src/models/TopCache.js';
import { createMockDatabase } from '../__mocks__/database';

describe('TopCacheModel', () => {
  const TopCacheModel = TopCacheModelModule as any;

  beforeEach(() => {
    jest.resetModules();
  });

  it('findByKey delegates to db.get', async () => {
    const db = createMockDatabase({ get: jest.fn(async () => null) });
    TopCacheModel.db = db;
    await TopCacheModel.findByKey({
      subject_type: 'artist',
      item_type: 'track',
      provider: 'lastfm',
      scope_key: 'all-time',
      subject_id: 1,
    });
    expect(db.get).toHaveBeenCalled();
  });

  it('findValidByKey returns null on expired or failed', async () => {
    const nowIso = '2024-01-02T00:00:00Z';
    const db = createMockDatabase({
      get: jest.fn(async () => ({
        expires_at: '2024-01-01T00:00:00Z',
        status: 'success',
      })),
    });
    TopCacheModel.db = db;
    const res1 = await TopCacheModel.findValidByKey(
      {
        subject_type: 'artist',
        item_type: 'track',
        provider: 'lastfm',
        scope_key: 'all-time',
      },
      nowIso,
    );
    expect(res1).toBeNull();

    (db.get as any).mockResolvedValueOnce({
      expires_at: '2999-01-01T00:00:00Z',
      status: 'failed',
    });
    const res2 = await TopCacheModel.findValidByKey(
      {
        subject_type: 'artist',
        item_type: 'track',
        provider: 'lastfm',
        scope_key: 'all-time',
      },
      nowIso,
    );
    expect(res2).toBeNull();
  });

  it('upsert updates existing', async () => {
    const db = createMockDatabase({
      get: jest
        .fn()
        .mockResolvedValueOnce({ id: 1 }) // existing
        .mockResolvedValueOnce({
          id: 1,
          scanned_at: 's',
          expires_at: 'e',
          status: 'success',
        }),
      run: jest.fn(async () => ({})),
    });
    TopCacheModel.db = db;
    const rec = await TopCacheModel.upsert(
      {
        subject_type: 'artist',
        item_type: 'track',
        provider: 'lastfm',
        scope_key: '30d',
      },
      's',
      'e',
      'success',
    );
    expect(rec.id).toBe(1);
  });

  it('upsert creates new when not existing', async () => {
    const db = createMockDatabase({
      get: jest
        .fn()
        .mockResolvedValueOnce(null) // existing not found
        .mockResolvedValueOnce({ id: 2 }),
      run: jest.fn(async () => ({ lastID: 2 })),
    });
    TopCacheModel.db = db;
    const rec = await TopCacheModel.upsert(
      {
        subject_type: 'artist',
        item_type: 'track',
        provider: 'lastfm',
        scope_key: '30d',
      },
      's',
      'e',
      'success',
    );
    expect(rec.id).toBe(2);
  });
});
