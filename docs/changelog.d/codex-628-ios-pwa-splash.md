- **#628** iOS PWA launch (splash) screen — home-screen installs now show a `#1c1c1c`
  charcoal launch image with the centered HOTSHOT lockup instead of a blank white flash,
  carrying the #621 identity to the install surface. The per-resolution portrait PNGs are
  emitted deterministically from the brand pipeline and wired as `apple-touch-startup-image`
  links. files: `scripts/generate-brand-assets.mjs` · `src/app.html` ·
  `static/apple-splash-*.png` · `static/README-icons.md` · ADR-0034
