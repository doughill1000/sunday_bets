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
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,ts}',
      'src/**/*.{test,spec}.{js,ts}',
    ]
  },
});