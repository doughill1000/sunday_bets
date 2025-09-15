import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [svelteTesting(), sveltekit()],
  test: {
    globals: true,
    css: true,
    environment: 'jsdom',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['src/**/__tests__/**'], // Exclude unit tests
    setupFiles: ['./tests/setup.ts']
  },
});