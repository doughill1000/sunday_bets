- **PR #877** The public demo now teaches the game on arrival — a short how-to-play primer
  auto-opens once per visitor on `/demo` (the dismissal is remembered per browser), and the
  persona banner's rules link relaxes from "New here? How the game works" into a quiet "How to
  play" re-entry door. Governed by ADR-0026; mirrors the authenticated welcome-guide pattern.
  files: `src/lib/components/demo/` · `src/routes/demo/+layout.svelte`
