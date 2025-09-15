-- Core read policies (games, lines, results, totals) — readable to authenticated

drop policy if exists sel_games on public.games;
create policy sel_games
  on public.games for select
  to authenticated
  using (true);

drop policy if exists sel_game_lines on public.game_lines;
create policy sel_game_lines
  on public.game_lines for select
  to authenticated
  using (true);

drop policy if exists sel_results on public.results;
create policy sel_results
  on public.results for select
  to authenticated
  using (true);

drop policy if exists sel_totals on public.totals;
create policy sel_totals
  on public.totals for select
  to authenticated
  using (true);
