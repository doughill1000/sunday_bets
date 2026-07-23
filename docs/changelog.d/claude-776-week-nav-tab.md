- **#776** Week gets its own nav tab — the weekly surface (picker, hardware + legend, pick
  breakdown, sweat board) moves from `/league`'s third tab to a first-class `/week`
  destination, second in a five-tab bar (Picks · Week · League · Stats · Market); `/league`
  returns to two lanes (Standings · Honors). Retires #584's live-window auto-flip — its
  signal survives as a red pulse dot on the Week nav tab — and `/league?view=weekly`
  permanently redirects to `/week`. Demo mirrors follow (`/demo/week`). routes:
  `(app)/week`, `demo/week` · files: `BottomTabBar.svelte`, `AppHeader.svelte`,
  `hooks.server.ts`, `liveScores.ts`, `notifications.ts`, `docs/DESIGN.md` · ADR-0030,
  ADR-0035
