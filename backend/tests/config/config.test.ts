import type { Config } from 'jest';

describe('config.ts environment parsing', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test.each([
    {
      name: 'uses defaults when env vars absent',
      env: {},
      expectSubset: {
        port: 3001,
        nodeEnv: 'test',
        databasePath: './musable.db',
        jwtSecret: 'your-super-secret-jwt-key',
        sessionSecret: 'your-super-secret-session-key',
        uploadPath: './uploads',
        libraryPaths: ['./music'],
        supportedFormats: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg'],
        youtubeEnabled: false,
        corsOrigin: 'http://localhost:3000',
      },
    },
    {
      name: 'parses numeric and boolean env vars',
      env: {
        PORT: '4000',
        MAX_FILE_SIZE: '12345',
        YOUTUBE_ENABLED: 'true',
        RATE_LIMIT_WINDOW_MS: '123',
        RATE_LIMIT_MAX_REQUESTS: '456',
        TOPS_DEFAULT_TTL_DAYS: '12',
      },
      expectSubset: {
        port: 4000,
        maxFileSize: 12345,
        youtubeEnabled: true,
        rateLimitWindowMs: 123,
        rateLimitMaxRequests: 456,
        topsDefaultTtlDays: 12,
      },
    },
    {
      name: 'parses JSON env arrays',
      env: {
        LIBRARY_PATHS: '["/mnt/music","/data/music"]',
        SUPPORTED_FORMATS: '["mp3","aac"]',
      },
      expectSubset: {
        libraryPaths: ['/mnt/music', '/data/music'],
        supportedFormats: ['mp3', 'aac'],
      },
    },
  ])('$name', async ({ env, expectSubset }) => {
    Object.assign(process.env, env);
    const mod = await import('../../src/config/config.js');
    const cfg = mod.default;
    for (const [k, v] of Object.entries(expectSubset)) {
      expect((cfg as any)[k]).toEqual(v);
    }
  });
});
