- **PR #877**, refined by **PR #878** The public demo now teaches the game on arrival — a
  how-to-play popup auto-opens on every `/demo` visit and shows the full shared rules the
  authenticated welcome guide uses (no summary, no second surface to open into), and the persona
  banner's rules link relaxes from "New here? How the game works" into a quiet "How to play"
  re-entry door. Governed by ADR-0026.
  files: `src/lib/components/demo/` · `src/routes/demo/+layout.svelte`
