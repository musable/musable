export type RunResult = { lastID?: number; changes?: number };

export interface MockDatabase {
  run: jest.Mock<Promise<RunResult>, any[]>;
  get: jest.Mock<Promise<any | null>, any[]>;
  query: jest.Mock<Promise<any[]>, any[]>;
  transaction: jest.Mock<Promise<void>, [() => Promise<void>] | []>;
}

export function createMockDatabase(
  overrides?: Partial<MockDatabase>,
): MockDatabase {
  const base: MockDatabase = {
    run: jest.fn(async () => ({ lastID: 1, changes: 1 })),
    get: jest.fn(async () => null),
    query: jest.fn(async () => []),
    transaction: jest.fn(async (fn?: () => Promise<void>) => {
      if (fn) await fn();
    }) as jest.Mock<Promise<void>, any>,
  };
  return { ...base, ...overrides } as MockDatabase;
}
