import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests run in Node.js environment (not browser)
    environment: 'node',
    // Only run tests in the integration directory
    include: ['tests/integration/**/*.test.ts'],
    // Longer timeout for database operations
    testTimeout: 30000,
    // Setup file if needed
    setupFiles: ['tests/integration/setup.ts']
  },
  // Resolve path aliases to match your project structure
  resolve: {
    alias: {
      '$lib': './src/lib'
    }
  }
});