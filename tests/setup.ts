import { beforeEach, afterAll } from 'vitest';

// Global test setup
beforeEach(async () => {
  // Database cleanup will be handled in individual test files
  // to avoid issues with parallel test execution
});

afterAll(async () => {
  // Cleanup connections
  console.log('Test suite completed');
});

// Make environment variables available in tests
process.env.NODE_ENV = 'test';

// Mock Clerk auth for API route tests
// This will be overridden in individual tests that need real auth
global.mockAuth = {
  userId: 'test_user_123',
  sessionClaims: {},
};
