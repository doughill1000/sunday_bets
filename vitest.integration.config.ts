import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [svelteTesting(), sveltekit()],
  test: {
    globals: true,
    css: true,
    environment: 'jsdom',
    // Integration tests share a local Supabase DB — run files sequentially to
    // avoid matchup-constraint races between suites that create the same games.
    fileParallelism: false,
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['src/**/__tests__/**', 'src/lib/components/ui/**'], // Exclude unit tests & ui components
    setupFiles: ['./tests/setup.ts', 'dotenv/config'], // This loads .env variables
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/integration',
      reporter: ['text', 'text-summary'],
      exclude: [
        '.svelte-kit/**',
        '.vercel/**',
        'dev-dist/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts,mjs,cjs}',
        'eslint.config.js',
        'playwright.config.*',
        'svelte.config.*',
        'vite.config.*',
        'vitest*.config.*',
        'tests/**',
        'src/lib/components/ui/**'
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50
      }
    }
  }
});
