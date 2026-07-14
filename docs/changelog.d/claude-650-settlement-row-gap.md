- **#650** Root-caused a 2025 game with 5 `pick_settlement` rows instead of 6: the
  pre-#447 missed-penalty pass (already fixed 2026-07-08, before this issue was filed)
  excluded the app admin via a `users.role='player'` filter, so the one 2025 game the
  admin skipped got no `missed` row, and no re-grade has run since to heal it. Adds a
  mechanism-agnostic completeness guard —
  `supabase/tests/055_pick_settlement_completeness.sql` — asserting every already-graded
  scoring game has one settlement row per active member, explicitly excluding
  `grading_locked` (2022-24 imported) seasons. The prod backfill for the one affected
  row is a pending, explicitly-flagged manual write.
