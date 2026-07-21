-- file: supabase/functions/picks_status_board.sql
--
-- ADR-0019 Decision point 6 (counts-only status carve-out): the group-visible
-- "who's picked" status board.
--
-- Returns, per ACTIVE member of one group for one week, how many games that member
-- has locked a pick on versus how many games the week has (e.g. 9/13) plus a
-- completion flag -- COUNTS ONLY. No game identity, side, team, or weight is exposed,
-- so nothing about *what* anyone picked is derivable pre-kickoff. This is metadata
-- about *whether* someone picked, which ADR-0019 explicitly carves out of the
-- sealed-envelope reveal.
--
-- Why a SECURITY DEFINER function and not a security_invoker view: base-table picks
-- RLS (sel_picks_owner_or_started) hides a co-member's picks until each game starts,
-- so under the caller's own RLS every co-member's pre-kickoff count would read as
-- zero -- the opposite of this board's purpose. This function instead bypasses
-- base-table RLS to count, then re-imposes an is_member() membership gate and exposes
-- no pick-level column. It grants no ability to read any *pick* the caller couldn't
-- already read -- only the aggregate count. Same mechanism and safety argument as
-- all_in_declarations (ADR-0023); the sel_picks_owner_or_started guarantee for pick
-- content stays structurally intact.
--
-- is_member(p_group_id) keys off auth.uid() (unaffected by SECURITY DEFINER), so a
-- non-member caller receives zero rows.
--
-- REMAINING-ONLY denominator: games_available counts only games still open to pick
-- (now() < commence_time), and picks_made counts each member's locks on those same
-- still-open games. A game that has kicked off drops out of both sides whether it was
-- picked or missed, so the board reads as "of the games still open, how many you've
-- locked" — it never leaves a member stuck at 12/13 for a game they missed. Once every
-- game has started the slate is 0/0 and everyone is trivially complete (nothing left to
-- wait on).
--
-- PER-MEMBER denominator (ADR-0037, #724): the slate is scoped to each member's
-- participation boundary, public._participation_start(group, member), so a member is never
-- shown as owing a game that starts before their participation begins. This is the read-side
-- twin of the boundary the grading choke point carries — the board enumerates membership x
-- games itself rather than reading pick_settlement, so it does not inherit that correctness.
-- The still-open filter already neutralises the joined_at term (a member cannot join after a
-- game that has not kicked off yet), so in practice the binding term here is the league's
-- competition_starts_at: a league that starts next week must not read as 0/13 behind on this
-- week's slate. Calling the shared helper rather than re-deriving greatest(...) keeps this
-- board and grading from ever disagreeing about who owed a pick.
create or replace function public.picks_status_board(
  p_group_id uuid,
  p_week_id  integer
)
returns table (
  group_id uuid,
  user_id uuid,
  display_name text,
  avatar_key text,
  picks_made integer,
  games_available integer,
  is_complete boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with members as (
    select
      gm.user_id,
      u.display_name,
      u.avatar_key,
      public._participation_start(p_group_id, gm.user_id) as participation_start
    from public.group_memberships gm
    join public.users u on u.id = gm.user_id
    where gm.group_id = p_group_id
      and gm.status = 'active'
  ),
  open_games as (
    select g.id, g.commence_time
    from public.games g
    where g.week_id = p_week_id
      and now() < g.commence_time
  ),
  member_slate as (
    select m.user_id, count(og.id)::integer as games_available
    from members m
    left join open_games og on og.commence_time >= m.participation_start
    group by m.user_id
  ),
  member_counts as (
    select p.user_id, count(*)::integer as picks_made
    from public.picks p
    join open_games og on og.id = p.game_id
    join members m on m.user_id = p.user_id
    where p.group_id = p_group_id
      and og.commence_time >= m.participation_start
    group by p.user_id
  )
  select
    p_group_id as group_id,
    m.user_id,
    m.display_name,
    m.avatar_key,
    coalesce(mc.picks_made, 0) as picks_made,
    ms.games_available,
    (coalesce(mc.picks_made, 0) >= ms.games_available) as is_complete
  from members m
  join member_slate ms on ms.user_id = m.user_id
  left join member_counts mc on mc.user_id = m.user_id
  where public.is_member(p_group_id);
$$;

comment on function public.picks_status_board(uuid, integer) is
  'ADR-0019 counts-only status board: per active group member for a week, picks_made / games_available / is_complete over games STILL OPEN to pick (now() < commence_time) — remaining picks, not missed or already-started games. The slate is PER MEMBER, scoped by _participation_start (ADR-0037): a member never owes a game that starts before their participation begins. Counts only, no side/team/weight/game. SECURITY DEFINER + is_member() gate; base-table picks RLS is untouched so no pick content is revealed pre-kickoff. See docs/adr/0019-pick-reveal-timing-model.md.';

-- Closed-by-default (ADR-0011): the baseline revokes EXECUTE from PUBLIC; this
-- read-only RPC self-grants in its own source file, per house convention
-- (cf. all_in_declarations.sql, unlock_pick.sql, set_active_line.sql).
revoke all on function public.picks_status_board(uuid, integer) from public, anon;
grant execute on function public.picks_status_board(uuid, integer) to authenticated, service_role;
