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
    ),
    // Sentry environment for the browser build. The client init can't read
    // process.env at runtime, so bake VERCEL_ENV in here at build time — mirroring
    // instrumentation.server.ts. Without this the client's Sentry.init falls back to
    // Sentry's default ('production'), so local-dev/preview browser errors were being
    // mislabeled 'production'. Vercel sets VERCEL_ENV on deploys; unset locally.
    __SENTRY_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? 'development'),
    // Show the Beta tag in the header (ADR-0028 follow-up / issue #697): an invitation
    // to report issues, gated on a config flag so it flips off in one change at public launch.
    // Defaults to true; set SHOW_BETA_TAG=false to hide.
    __SHOW_BETA_TAG__: JSON.stringify(process.env.SHOW_BETA_TAG !== 'false')
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
        // Off by default: generating the dev SW re-runs a Workbox precache scan on every
        // boot, which is a big chunk of local dev startup time. Opt in with PWA_DEV=true
        // when you actually need to test offline/install behavior locally.
        enabled: mode === 'development' && process.env.PWA_DEV === 'true'
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
        // Stable app identity so installs/updates target the same app across manifest
        // changes. Resolves to the origin root — equal to the previous implicit id
        // (start_url), so existing installs are not orphaned.
        id: '/',
        name: 'Hotshot',
        short_name: 'Hotshot',
        description: "NFL pick'em against the spread with friends — track your picks offline.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#1c1c1c',
        theme_color: '#1c1c1c',
        // Long-press app-icon shortcuts (Android/Chromium) into the two most common tasks.
        shortcuts: [
          {
            name: 'Make picks',
            short_name: 'Picks',
            url: '/picks',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Standings',
            short_name: 'League',
            url: '/league',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          }
        ],
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
