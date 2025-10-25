import TopItemModelModule from '../../src/models/TopItem.js';
import { createMockDatabase } from '../__mocks__/database';

describe('TopItemModel', () => {
  const TopItemModel = TopItemModelModule as any;

  beforeEach(() => {
    jest.resetModules();
  });

  it('deleteByCacheId calls db.run', async () => {
    const db = createMockDatabase();
    TopItemModel.db = db;
    await TopItemModel.deleteByCacheId(1);
    expect(db.run).toHaveBeenCalled();
  });

  it('insertMany iterates and runs insert', async () => {
    const db = createMockDatabase();
    TopItemModel.db = db;
    await TopItemModel.insertMany([
      { cache_id: 1, subject_type: 'artist', item_type: 'track', rank: 1 },
      {
        cache_id: 1,
        subject_type: 'artist',
        item_type: 'track',
        rank: 2,
        title: 't',
      },
    ] as any);
    expect(db.run).toHaveBeenCalledTimes(2);
  });

  it('getByCacheId queries items', async () => {
    const db = createMockDatabase({ query: jest.fn(async () => [{ id: 1 }]) });
    TopItemModel.db = db;
    const res = await TopItemModel.getByCacheId(3);
    expect(Array.isArray(res)).toBe(true);
  });
});
