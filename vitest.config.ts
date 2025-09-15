import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      $components: path.resolve(__dirname, 'src/lib/components')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['tests/integration/**'], // Exclude integration tests
    setupFiles: ['./tests/setup.ts'],
    deps: {
      inline: [/@testing-library\/jest-dom/],
    },
  },
});
