# Hotshot brand assets

The canonical geometry for the Hotshot mark, favicon, and stacked auth lockup lives in
`scripts/generate-brand-assets.mjs`. Run the generator after changing that geometry:

```sh
corepack pnpm brand:assets
```

The command writes the vector sources and every raster derivative in one pass so the
family cannot drift:

| Asset                         | Dimensions | Consumer                                      |
| ----------------------------- | ---------- | --------------------------------------------- |
| `logo-mark.svg`               | scalable   | App header and demo navigation                |
| `hotshot-lockup.svg`          | scalable   | Canonical stacked mark + HOTSHOT lockup       |
| `favicon.svg`                 | scalable   | Modern browser favicon                        |
| `logo-mark.png`               | 512×512    | Raster standalone-mark fallback               |
| `hotshot-lockup.png`          | 1181×638   | Sign-in page                                  |
| `favicon-16x16.png`           | 16×16      | Browser fallback / ICO frame                  |
| `favicon-32x32.png`           | 32×32      | Browser fallback / ICO frame                  |
| `favicon-48x48.png`           | 48×48      | Browser fallback / notification badge         |
| `favicon.ico`                 | 16/32/48   | Legacy browser fallback                       |
| `apple-touch-icon.png`        | 180×180    | iOS Home Screen                               |
| `pwa-192x192.png`             | 192×192    | PWA manifest, shortcuts, and push artwork     |
| `pwa-512x512.png`             | 512×512    | PWA manifest                                  |
| `pwa-1024x1024.png`           | 1024×1024  | High-resolution install artwork               |
| `maskable-icon-512x512.png`   | 512×512    | PWA adaptive mask; mark stays in the safe zone |

`src/app.html` links the vector favicon before the multi-frame ICO fallback. The PWA
manifest entries live in `vite.config.ts`; push notifications reuse the 192px PWA icon
and the 48px favicon.
