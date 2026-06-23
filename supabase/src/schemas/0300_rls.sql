-- Enable RLS everywhere (deny by default)
alter table public.picks      enable row level security;
alter table if exists public.pick_settlement enable row level security;
alter table public.games      enable row level security;
alter table public.game_lines enable row level security;
alter table public.results    enable row level security;
alter table public.totals     enable row level security;
alter table public.users      enable row level security;
alter table public.settings   enable row level security;
alter table public.audit_log  enable row level security;
alter table public.weeks      enable row level security;
alter table public.seasons    enable row level security;
alter table public.teams      enable row level security;

-- GAMES & LINES & RESULTS & TOTALS: readable to all authenticated
drop policy if exists sel_games on public.games;
create policy sel_games on public.games for select to authenticated using (true);

drop policy if exists sel_game_lines on public.game_lines;
create policy sel_game_lines on public.game_lines for select to authenticated using (true);

drop policy if exists sel_results on public.results;
create policy sel_results on public.results for select to authenticated using (true);

drop policy if exists sel_totals on public.totals;
create policy sel_totals  on public.totals  for select to authenticated using (true);

-- Teams/Weeks/Seasons readable to authenticated
drop policy if exists sel_weeks on public.weeks;
create policy sel_weeks on public.weeks for select to authenticated using (true);

drop policy if exists sel_seasons on public.seasons;
create policy sel_seasons on public.seasons for select to authenticated using (true);

drop policy if exists sel_teams on public.teams;
create policy sel_teams on public.teams for select to authenticated using (true);

-- USERS: everyone can read; self can update display_name
drop policy if exists sel_users on public.users;
create policy sel_users on public.users for select to authenticated using (true);

drop policy if exists upd_users_self on public.users;
create policy upd_users_self on public.users for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- PICKS: owner-only before kickoff for writes; reveal after kickoff
drop policy if exists sel_picks_owner_or_started on public.picks;
create policy sel_picks_owner_or_started
on public.picks for select to authenticated
using (
  public.is_member(group_id)
  and (user_id = (select auth.uid()) or public.game_has_started(game_id))
);

drop policy if exists ins_picks_own_pre on public.picks;
create policy ins_picks_own_pre
on public.picks for insert to authenticated
with check (
  public.is_member(group_id)
  and user_id = (select auth.uid())
  and not public.game_has_started(game_id)
);

drop policy if exists upd_picks_pre on public.picks;
create policy upd_picks_pre
on public.picks for update to authenticated
using (
  public.is_member(group_id)
  and user_id = (select auth.uid())
  and not public.game_has_started(game_id)
)
with check (
  public.is_member(group_id)
  and user_id = (select auth.uid())
  and not public.game_has_started(game_id)
);

-- SETTINGS & AUDIT: admin-only
drop policy if exists admin_sel_settings on public.settings;
create policy admin_sel_settings on public.settings for select to authenticated using (public.is_admin());

drop policy if exists admin_all_settings on public.settings;
create policy admin_all_settings on public.settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_sel_audit on public.audit_log;
create policy admin_sel_audit on public.audit_log for select to authenticated using (public.is_admin());

drop policy if exists admin_ins_audit on public.audit_log;
create policy admin_ins_audit on public.audit_log for insert to authenticated with check (public.is_admin());
