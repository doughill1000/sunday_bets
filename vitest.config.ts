import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import path from 'path';

export default defineConfig({
  plugins: [svelteTesting(), sveltekit()],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      $components: path.resolve(__dirname, 'src/lib/components')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    exclude: ['src/lib/components/ui/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/unit',
      reporter: ['text', 'text-summary'],
      exclude: [
        // generated/build
        '.svelte-kit/**',
        '.vercel/**',
        'dev-dist/**',
        'dist/**',
        'build/**',
        'coverage/**',

        // configs & meta
        '**/*.d.ts',
        '**/*.config.{js,ts,mjs,cjs}',
        'eslint.config.js',
        'playwright.config.*',
        'svelte.config.*',
        'vite.config.*',
        'vitest*.config.*',

        // tests & helpers
        'tests/**',
        'src/**/__tests__/**',

        // (optional) app shell/pages if you don’t want them in unit coverage
        // 'src/routes/**/+layout.svelte',
        // 'src/routes/**/+page.svelte',

        // (optional) scripts you don’t want in unit coverage
        'supabase/scripts/**',
        'src/lib/components/ui/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  }
});
