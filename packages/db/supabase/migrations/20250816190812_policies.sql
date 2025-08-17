-- DENY BY DEFAULT
alter table public.picks enable row level security;
alter table public.games enable row level security;
alter table public.game_lines enable row level security;
alter table public.results enable row level security;
alter table public.totals enable row level security;
alter table public.users enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

-- GAMES & LINES & RESULTS & TOTALS: readable to all authenticated; writes via admin RPCs only
create policy sel_games on public.games for select to authenticated using (true);
create policy sel_game_lines on public.game_lines for select to authenticated using (true);
create policy sel_results on public.results for select to authenticated using (true);
create policy sel_totals  on public.totals  for select to authenticated using (true);

-- USERS: everyone can read id/display_name; self can update own display_name
create policy sel_users on public.users for select to authenticated using (true);
create policy upd_users_self on public.users for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- PICKS: owner-only before kickoff; reveal after kickoff
-- SELECT: owner OR game started
create policy sel_picks_owner_or_started
on public.picks for select to authenticated
using (user_id = auth.uid() or game_has_started(game_id));

-- INSERT: owner only, before kickoff
create policy ins_picks_own_pre
on public.picks for insert to authenticated
with check (user_id = auth.uid() and not game_has_started(game_id));

-- UPDATE: owner only, before kickoff, and only if relock not yet used
create policy upd_picks_once_pre
on public.picks for update to authenticated
using (user_id = auth.uid() and not game_has_started(game_id) and relock_used = false)
with check (user_id = auth.uid() and not game_has_started(game_id) and relock_used = false);

-- No DELETE policy (implicitly denied)

-- SETTINGS & AUDIT: admin-only
create policy admin_sel_settings on public.settings for select to authenticated using (is_admin());
create policy admin_all_settings on public.settings for all     to authenticated using (is_admin()) with check (is_admin());
create policy admin_sel_audit    on public.audit_log for select to authenticated using (is_admin());
create policy admin_ins_audit    on public.audit_log for insert to authenticated with check (is_admin());
