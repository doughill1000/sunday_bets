- **#658** Fix `rollover-week`'s completeness check, which compared
  `pick_settlement` row counts to raw pick counts and could never pass once
  anyone missed a pick (confirmed failing every run on prod since
  2026-06-23). Now mirrors `find_unsettled_weeks`' predicate: complete once
  every final game has been graded. files:
  `supabase/src/functions/grade/advance_week_if_complete.sql`
