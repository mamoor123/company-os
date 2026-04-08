/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testTimeout: 15000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Run serially when using PostgreSQL to avoid shared-state conflicts
  ...(process.env.DATABASE_URL ? { maxWorkers: 1 } : {}),
};
