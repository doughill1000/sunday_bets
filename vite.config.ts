import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sentrySvelteKit } from '@sentry/sveltekit';

export default defineConfig(({ mode }) => ({
  define: {
    // Stable per-deploy id used as the TanStack Query IndexedDB persister `buster`
    // (ADR-0017): a new deploy invalidates any persisted client cache. Vercel sets
    // VERCEL_GIT_COMMIT_SHA at build; locally we fall back to the build timestamp.
    __BUILD_ID__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? String(Date.now())
    )
  },
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: 'doughill1000',
        project: 'javascript-sveltekit'
      }
    }),
    sveltekit(),
    tailwindcss(),
    SvelteKitPWA({
      srcDir: 'src',
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: mode === 'development' // only enable in dev
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Load custom push/notificationclick handlers into the generated SW.
        importScripts: ['/push-handler.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      manifest: {
        name: 'Sunday Bets',
        short_name: 'Sunday Bets',
        description: 'Track and manage your Sunday football betting picks offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#080a0c',
        theme_color: '#080a0c',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
}));
