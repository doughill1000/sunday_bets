# Sunday Bets PWA icon assets

Suggested placement for a SvelteKit app:

- Copy these files into `static/`
- Reference them as `/pwa-192x192.png`, `/pwa-512x512.png`, etc.

Recommended manifest entries:

```ts
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
```

Recommended app.html links:

```html
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```
