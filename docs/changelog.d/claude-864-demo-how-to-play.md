- **#864** A stranger on the public `/demo` can now learn the game, not just watch it — the
  persona banner carries a quiet "New here? How the game works" link to a new
  `/demo/how-to-play`, so the rules (spread, weights, All-In, symmetric scoring) are reachable
  without signing up. The page renders the same `HowToPlay.svelte` the authenticated
  `/how-to-play` does — no forked copy, so the two surfaces cannot drift. Deliberately not a
  sixth tab: the demo nav still mirrors the real app's exact five. Governed by ADR-0026 (public
  demo season); `DemoBanner.svelte` · `src/routes/demo/how-to-play/` ·
  `tests/e2e/demo-how-to-play.spec.ts`.
