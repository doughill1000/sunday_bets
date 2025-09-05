import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    prerender: { entries: [] }
  },
  vitePlugin: {
    experimental: { inspector: true },
    plugins: [
      SvelteKitPWA({
        registerType: 'autoUpdate',
        // Serve these as-is from /static
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        // Enable in dev for easy testing (optional; remove if you don’t want it)
        devOptions: { enabled: true },
        // Cache the usual suspects
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}']
        },
        manifest: {
          name: 'Sunday Bets',
          short_name: 'Bets',
          id: '/',
          scope: '/',
          start_url: '/',
          display: 'standalone',
          background_color: '#000000',
          theme_color: '#004d26',
          icons: [
            { src: 'icons/icon-48x48.png',  sizes: '48x48',   type: 'image/png' },
            { src: 'icons/icon-72x72.png',  sizes: '72x72',   type: 'image/png' },
            { src: 'icons/icon-96x96.png',  sizes: '96x96',   type: 'image/png' },
            { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
            { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },

            // Keep these only if you truly prepared safe-padding versions
            { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ]
  }
};

export default config;
