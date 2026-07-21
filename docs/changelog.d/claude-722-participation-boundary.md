- **#712** A member is no longer charged missed-pick penalties for games that kicked off
  before they joined, and a league created midseason no longer accrues penalties for the
  weeks before it existed — grading now gates on a participation boundary derived from the
  league's competition start and the member's join, defined once and shared with the
  settlement-completeness guard. Existing leagues are backfilled so no already-settled game
  becomes ineligible. files: `supabase/src/functions/_private/`, `supabase/src/schemas/` ·
  governed by ADR-0037 (ruling 3 amended here).
