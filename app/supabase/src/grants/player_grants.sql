 -- =========================
-- PLAYER (authenticated, non-admin)
-- =========================
-- Baseline read (RLS still applies)
grant select on public.games,
               public.game_lines,
               public.results,
               public.totals,
               public.users,
               public.weeks,
               public.seasons,
               public.teams
to authenticated;

-- Picks (insert/update/select all enforced by RLS)
grant select, insert, update on public.picks to authenticated;

-- Settings & audit: grant exists so queries don’t error,
-- but RLS ensures only admins actually see/modify.
grant select, insert, update, delete on public.settings, public.audit_log to authenticated;

-- Optional: anon can read games/lines (e.g., public schedule)
grant select on public.games, public.game_lines to anon;