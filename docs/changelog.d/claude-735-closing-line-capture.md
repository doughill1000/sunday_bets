- **#735** House grading now refuses to settle a game with no captured closing line
  instead of silently falling back to each player's pick-time line — 2025 was left
  almost entirely unflagged because closing-line capture runs only at a game's first
  grade and shipped after that season had already finished grading. Adds regression
  coverage that the write-once closing flag never moves once set. files:
  `supabase/src/functions/_private/` · governed by ADR-0007.
