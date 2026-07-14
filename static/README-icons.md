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
| `hotshot-lockup.svg`          | scalable   | Sign-in page — transparent stacked mark + HOTSHOT lockup |
| `favicon.svg`                 | scalable   | Modern browser favicon                        |
| `logo-mark.png`               | 512×512    | Raster standalone-mark fallback               |
| `favicon-16x16.png`           | 16×16      | Browser fallback / ICO frame                  |
| `favicon-32x32.png`           | 32×32      | Browser fallback / ICO frame                  |
| `favicon-48x48.png`           | 48×48      | Browser fallback / notification badge         |
| `favicon.ico`                 | 16/32/48   | Legacy browser fallback                       |
| `apple-touch-icon.png`        | 180×180    | iOS Home Screen                               |
| `pwa-192x192.png`             | 192×192    | PWA manifest, shortcuts, and push artwork     |
| `pwa-512x512.png`             | 512×512    | PWA manifest                                  |
| `pwa-1024x1024.png`           | 1024×1024  | High-resolution install artwork               |
| `maskable-icon-512x512.png`   | 512×512    | PWA adaptive mask; mark stays in the safe zone |
| `apple-splash-<width>x<height>.png` | device pixels | iOS Home Screen launch images           |

`src/app.html` links the vector favicon before the multi-frame ICO fallback. The PWA
manifest entries live in `vite.config.ts`; push notifications reuse the 192px PWA icon
and the 48px favicon.

## iOS launch images

The generator centers the canonical stacked lockup on the same `#1c1c1c` charcoal as
the manifest and keeps it inside a 12% edge-safe area. `src/app.html` selects the exact
portrait PNG with device-width, device-height, and pixel-ratio media queries.

| CSS viewport | DPR | Generated PNG |
| ------------ | --- | ------------- |
| 320×568      | 2   | 640×1136      |
| 375×667      | 2   | 750×1334      |
| 414×736      | 3   | 1242×2208     |
| 375×812      | 3   | 1125×2436     |
| 414×896      | 2   | 828×1792      |
| 414×896      | 3   | 1242×2688     |
| 390×844      | 3   | 1170×2532     |
| 393×852      | 3   | 1179×2556     |
| 402×874      | 3   | 1206×2622     |
| 428×926      | 3   | 1284×2778     |
| 430×932      | 3   | 1290×2796     |
| 420×912      | 3   | 1260×2736     |
| 440×956      | 3   | 1320×2868     |

Apple documents the launch-image link relation in its Safari web-app guidance; the
current pixel families are cross-checked against Apple's iPhone screenshot and hardware
specifications. Android/Chromium continues to synthesize its launch screen from the
unchanged manifest name, charcoal background, and PWA icons.
