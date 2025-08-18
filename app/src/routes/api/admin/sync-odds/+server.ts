import type { RequestHandler } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { fetchNFLSpreadsForWeek, extractBarstoolSpread } from '$lib/server/odds';

function clampISO(d: Date) { return d.toISOString(); }

export const POST: RequestHandler = async () => {
  // 1) Find the active week window
  const { data: week, error: werr } = await supabaseService
    .from('weeks')
    .select('*')
    .eq('is_active', true)
    .single();

  if (werr || !week) {
    return new Response(JSON.stringify({ ok: false, reason: 'No active week' }), { status: 400 });
  }

  // 2) Rate cap guard (settings table)
  const { data: st } = await supabaseService.from('settings').select('*').limit(1).maybeSingle();
  const cap = st?.odds_api_monthly_cap ?? 500;
  const used = st?.odds_api_calls_used_current_month ?? 0;
  if (used + 1 > cap) {
    return new Response(JSON.stringify({ ok: false, reason: 'Monthly cap reached' }), { status: 429 });
  }

  // Optional: “Sunday morning if >80%” holdback rule lives here

  // 3) Fetch odds
  const games = await fetchNFLSpreadsForWeek(clampISO(new Date(week.start_ts)), clampISO(new Date(week.end_ts)));

  // 4) Upsert teams (ensure by short_name/external key)
  // If you already seeded teams, you can skip this. Otherwise, map names->your team keys before upsert lines.
  // Assume you have teams.short_name matching Odds API names (e.g., "Philadelphia Eagles").
  // If not, keep a mapping table TEAM_NAME -> short code.

  // 5) Upsert games + lines
  for (const g of games) {
    // Lookup team ids by name
    const { data: awayTeam } = await supabaseService.from('teams').select('id, short_name').eq('name', g.away_team).maybeSingle();
    const { data: homeTeam } = await supabaseService.from('teams').select('id, short_name').eq('name', g.home_team).maybeSingle();
    if (!awayTeam || !homeTeam) continue; // or add mapping logic

    // Upsert game
    const { data: gameRow, error: gErr } = await supabaseService
      .from('games')
      .upsert({
        week_id: week.id,
        external_game_id: g.id,
        commence_time: g.commence_time,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        status: 'scheduled'
      }, { onConflict: 'external_game_id' })
      .select('*')
      .single();
    if (gErr || !gameRow) continue;

    // Extract barstool spread
    const spread = extractBarstoolSpread(g);
    if (!spread) continue;

    // Determine spread team id
    const spreadTeamId =
      spread.spreadTeamName === homeTeam.short_name || spread.spreadTeamName === homeTeam.short_name
        ? homeTeam.id
        : awayTeam.id;

    // Deactivate previous active line
    await supabaseService.from('game_lines').update({ is_active_line: false }).eq('game_id', gameRow.id).eq('is_active_line', true);

    // Insert new active line
    await supabaseService.from('game_lines').insert({
      game_id: gameRow.id,
      source: 'barstool',
      spread_team_id: spreadTeamId,
      spread_value: spread.spreadValue,
      fetched_at: new Date().toISOString(),
      is_active_line: true
    });
  }

  // 6) Log the API call
  await supabaseService.from('settings').update({
    odds_api_calls_used_current_month: used + 1
  }).neq('odds_api_monthly_cap', null); // cheap way to hit the singleton row

  return new Response(JSON.stringify({ ok: true, count: games.length }), { status: 200 });
};
