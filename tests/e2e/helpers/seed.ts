import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared service-role helpers for E2E specs.
 *
 * Centralises the two things several specs used to duplicate inline: building
 * the RLS-bypassing service-role client, and looking up the deterministic
 * fixtures `global-setup.ts` seeds. Specs reset the mutable data they touch in
 * `beforeEach` via these helpers so no test depends on another's leftover DB
 * state (see the isolation rule in `docs/agent-context/testing.md`).
 */

// Must match the fixtures seeded in `tests/e2e/global-setup.ts`.
const SEASON_YEAR = 2026;
const WEEK_NUMBER = 1;

/**
 * Service-role (RLS-bypassing) Supabase client for the LOCAL test stack.
 * Throws if the local-stack env is absent — mirrors `global-setup.ts` so a
 * misconfigured run fails loudly instead of silently skipping seeding.
 */
export function makeServiceClient(): SupabaseClient {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    throw new Error(
      'E2E seed: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set (see .env.test or the CI env block).'
    );
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

/**
 * Resolve the id of the KC/BUF game `global-setup.ts` seeds (season 2026 →
 * week 1). Matches by matchup (either orientation), the same order-independent
 * lookup the seed itself uses, so it stays correct if the game was cloned from
 * prod with a different `external_game_id`.
 */
export async function resolveSeededGameId(supabase: SupabaseClient): Promise<string> {
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', SEASON_YEAR)
    .maybeSingle();
  if (!season) throw new Error(`resolveSeededGameId: season ${SEASON_YEAR} not found`);

  const { data: week } = await supabase
    .from('weeks')
    .select('id')
    .eq('season_id', season.id)
    .eq('week_number', WEEK_NUMBER)
    .maybeSingle();
  if (!week) throw new Error(`resolveSeededGameId: week ${WEEK_NUMBER} not found`);

  const { data: teams } = await supabase
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  const kc = teams?.find((t) => t.short_name === 'KC');
  const buf = teams?.find((t) => t.short_name === 'BUF');
  if (!kc || !buf) throw new Error('resolveSeededGameId: KC/BUF teams not found');

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('week_id', week.id)
    .or(
      `and(home_team_id.eq.${kc.id},away_team_id.eq.${buf.id}),` +
        `and(home_team_id.eq.${buf.id},away_team_id.eq.${kc.id})`
    )
    .maybeSingle();
  if (!game) throw new Error('resolveSeededGameId: seeded KC/BUF game not found');
  return game.id;
}

/**
 * Delete every pick for a game so a spec starts from a clean "0 saved" board.
 * Same statement `global-setup.ts` runs once globally — called per-test here so
 * picks specs don't inherit rows auto-saved by a previous test.
 */
export async function resetPicksForGame(supabase: SupabaseClient, gameId: string): Promise<void> {
  const { error } = await supabase.from('picks').delete().eq('game_id', gameId);
  if (error) throw new Error('resetPicksForGame: ' + error.message);
}
