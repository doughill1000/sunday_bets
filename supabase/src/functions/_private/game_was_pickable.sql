-- _game_was_pickable: could this league have picked this game before it kicked off?
--
-- The pickability half of the settlement gate (ADR-0040, #803), and the structural mirror of
-- _participation_start: that helper bounds the missed-penalty population in TIME, this one
-- bounds it by whether picking was ever POSSIBLE at all.
--
-- lock_pick / lock_pick_all_groups refuse a pick on a game with no active line for the
-- league's source ('no active line for game % (source=%)'). The missed-penalty pass in
-- _grade_games_by_ids had no matching gate -- its comment said outright that "line is
-- irrelevant for missed picks" -- so a game that reached kickoff unlined charged every
-- active member the -1 for an inaction the system had structurally forbidden them to avoid.
--
-- "Pickable" here means: a game_lines row existed for this league's line_source at or before
-- kickoff. Three deliberate choices inside that predicate:
--
--   * The source is resolved from group_config exactly the way lock_pick_all_groups resolves
--     it (coalesce(line_source, 'fanduel')), so the pick path and the grade path can never
--     disagree about which book a league plays off. A line filed under a DIFFERENT source
--     cannot make a game gradable-but-unpickable.
--   * fetched_at <= commence_time, NOT is_active_line. is_active_line is a live pointer that
--     a post-kickoff sync can move (and its unique index is per game, not per source), while
--     this asks the historical question the penalty turns on: was there ever a line to pick?
--     It is deliberately the same population _capture_closing_line flags, so "was pickable"
--     and "has a closing line" describe the same set once capture has run -- but unlike
--     is_closing_line it is also correct BEFORE the game's first grade, which is what
--     _settlement_owed needs (capture only ever runs on the grade path, #735).
--   * Existence, not currency. game_lines is append-only, so a row fetched pre-kickoff is
--     durable proof the game was pickable at some point before it started.
--
-- SECURITY DEFINER for the same reason as _participation_start and _settlement_owed: the
-- answer is a scoring fact, and a caller reading under RLS must not see a different verdict
-- than grading used. Born closed to anon/authenticated by the _close_new_fn_acl event trigger
-- (schemas/0000_function_acl_guard.sql, ADR-0011); an internal helper, never a client RPC.
create or replace function public._game_was_pickable(p_group_id uuid, p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games g
    join public.game_lines gl
      on gl.game_id = g.id
     and gl.fetched_at <= g.commence_time
     and gl.source = coalesce(
           (select gc.line_source from public.group_config gc where gc.group_id = p_group_id),
           'fanduel'
         )
    where g.id = p_game_id
  );
$$;

comment on function public._game_was_pickable(uuid, uuid) is
  'ADR-0040 / #803: true when a game_lines row for this league''s line_source existed at or before kickoff -- i.e. when lock_pick would have accepted a pick. The missed-penalty pass in _grade_games_by_ids and _settlement_owed both gate on it, so a game nobody was permitted to pick charges nobody and does not strand the reconcile sweep.';
