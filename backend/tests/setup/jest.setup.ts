import 'jest';

// Ensure NODE_ENV is set for predictable config branches
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Reset modules between tests to isolate env-based imports
afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

// Silence noisy DB logs during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
