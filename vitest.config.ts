import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.ts', 'app/**/*.tsx', 'lib/**/*.ts', 'jobs/**/*.ts'],
    },
    testTimeout: 60000, // 60 seconds for real API calls (Letta may be slow)
    fileParallelism: false, // Run test files sequentially to prevent database cleanup race conditions
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
