- **#657** Fix grading preset freeze to be per-game-cohort, not per-row — a settlement
  row born into an already-graded game (a new active member, or a backfilled gap) now
  adopts the preset its game's existing rows were already frozen under, instead of
  falling through to the group's current config. ADR-0007 (2026-07-15 amendment).
  files: `supabase/src/functions/_private/grade_games_by_ids.sql`
