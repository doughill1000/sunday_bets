// tests/integration/games.test.ts
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { createServiceClient } from './_auth';
import {
  TEST_USERS,
  ensureCoreTestUsers,
  ensureTeams,
  ensureSeasonAndWeek,
  ensureSettings,
  clearWeekGames
} from './fixtures/db';

import { listWeekGamesWithPicks } from '../../src/lib/server/games';

// ---- Test helpers -----------------------------------------------------------

const admin = createServiceClient();
const EXTERNAL_TAG = `games-int-${Date.now()}`;
const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

/**
 * Minimal RequestEvent mock to satisfy listWeekGamesWithPicks auth check.
 */
function makeEventWithUser(userId: string): RequestEvent {
  return {
    locals: {
      supabase: {
        auth: {
          getUser: async () => ({
            data: { user: { id: userId } },
            error: null
          })
        }
      }
    }
    // other RequestEvent fields are not used by listWeekGamesWithPicks
  } as unknown as RequestEvent;
}

function makeEventUnauthed(): RequestEvent {
  return {
    locals: {
      supabase: {
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: null
          })
        }
      }
    }
  } as unknown as RequestEvent;
}

async function createGameWithActiveLine(opts: {
  weekId: number;
  homeTeamId: number;
  awayTeamId: number;
  kickoffISO: string;
  tag: string;
}) {
  const { weekId, homeTeamId, awayTeamId, kickoffISO, tag } = opts;

  // Create game
  const { data: game, error: gErr } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      external_game_id: tag,
      status: 'scheduled',
      commence_time: kickoffISO
    })
    .select('id')
    .single();
  if (gErr) throw new Error(`create game: ${gErr.message}`);

  const gameId = game!.id as string;

  // Active Fanduel line (home favorite) + matching inactive mirror
  const now = new Date().toISOString();
  const { error: lineErr } = await admin.from('game_lines').insert([
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: homeTeamId,
      spread_value: -2.5,
      is_active_line: true,
      fetched_at: now
    },
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: awayTeamId,
      spread_value: 2.5,
      is_active_line: false,
      fetched_at: now
    }
  ]);
  if (lineErr) throw new Error(`insert line: ${lineErr.message}`);

  return gameId;
}

// ---- Suite ------------------------------------------------------------------

describe('listWeekGamesWithPicks integration', () => {
  let weekId: number;
  let homeTeamId: number;
  let awayTeamId: number;
  let startedAwayId: number;
  let meUserId: string;
  let otherUserId: string;

  let futureGameId: string;
  let startedGameId: string;

  beforeAll(async () => {
    // Core seed & settings. This suite owns week 2 of the 2024 season so its two
    // games never collide (via uq_games_matchup) with games other suites seed.
    await ensureCoreTestUsers(admin, true);
    await ensureTeams(admin);
    // A third team so the two games below are distinct matchups: uq_games_matchup
    // forbids two games with the same (week, team-pair).
    const { error: extraTeamErr } = await admin
      .from('teams')
      .upsert([{ name: 'Philadelphia Eagles', short_name: 'PHI' }], { onConflict: 'name' });
    if (extraTeamErr) throw new Error(`seed extra team: ${extraTeamErr.message}`);
    weekId = (await ensureSeasonAndWeek(admin, 2024, 2)).weekId;
    await ensureSettings(admin);

    // Resolve teams by name from your seed fixtures
    const { data: teams, error: tErr } = await admin.from('teams').select('id,name,short_name');
    if (tErr) throw tErr;
    if (!teams?.length) throw new Error('Teams not seeded');

    const chiefs = teams.find((t: any) => t.name === 'Kansas City Chiefs');
    const bills = teams.find((t: any) => t.name === 'Buffalo Bills');
    const eagles = teams.find((t: any) => t.name === 'Philadelphia Eagles');
    if (!chiefs || !bills || !eagles) throw new Error('Expected Chiefs/Bills/Eagles seeded');

    // Chiefs is home in both games; the away team differs so the matchups are
    // distinct. future = Chiefs vs Bills, started = Chiefs vs Eagles.
    homeTeamId = chiefs.id as number;
    awayTeamId = bills.id as number;
    startedAwayId = eagles.id as number;

    // Pick two users from fixture table
    const { data: users, error: uErr } = await admin
      .from('users')
      .select('id, display_name')
      .order('id', { ascending: true });
    if (uErr) throw uErr;
    if (!users || users.length < 2) throw new Error('Need at least 2 users seeded');

    meUserId = users.find((u: any) => u.display_name === TEST_USERS[0].display)?.id as string;
    otherUserId = users.find((u: any) => u.display_name === TEST_USERS[1].display)?.id as string;
    if (!meUserId || !otherUserId) throw new Error('Could not resolve two fixture users');

    const { error: membershipErr } = await admin.from('group_memberships').upsert(
      [
        { group_id: ORIGINAL_GROUP_ID, user_id: meUserId, role: 'member' },
        { group_id: ORIGINAL_GROUP_ID, user_id: otherUserId, role: 'member' }
      ],
      { onConflict: 'group_id,user_id' }
    );
    if (membershipErr) throw new Error(`upsert group memberships: ${membershipErr.message}`);

    // Clear any games this suite owns (picks/game_lines cascade) so a crashed
    // prior run can't leave a matchup behind that collides with uq_games_matchup.
    await clearWeekGames(admin, weekId);

    // Create one future game (+10 min) and one "already started" game (-10 min)
    const kickoffFuture = new Date(Date.now() + 10 * 60_000).toISOString();
    futureGameId = await createGameWithActiveLine({
      weekId,
      homeTeamId,
      awayTeamId,
      kickoffISO: kickoffFuture,
      tag: EXTERNAL_TAG + '-future'
    });

    const kickoffPast = new Date(Date.now() - 10 * 60_000).toISOString();
    startedGameId = await createGameWithActiveLine({
      weekId,
      homeTeamId,
      awayTeamId: startedAwayId,
      kickoffISO: kickoffPast,
      tag: EXTERNAL_TAG + '-started'
    });

    // Insert picks for both users on both games; lock times in the past to simulate already-locked
    const lockedAt = new Date(Date.now() - 1 * 60_000).toISOString();

    const { data: futureLine, error: flErr } = await admin
      .from('game_lines')
      .select('id, spread_team_id, spread_value')
      .eq('game_id', futureGameId)
      .eq('is_active_line', true)
      .maybeSingle();

    if (flErr) throw flErr;
    if (!futureLine) throw new Error('No active line for future game');

    const { data: startedLine, error: slErr } = await admin
      .from('game_lines')
      .select('id, spread_team_id, spread_value')
      .eq('game_id', startedGameId)
      .eq('is_active_line', true)
      .maybeSingle();

    if (slErr) throw slErr;
    if (!startedLine) throw new Error('No active line for started game');

    const { error: pErr } = await admin.from('picks').insert([
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: meUserId,
        game_id: futureGameId,
        picked_team_id: homeTeamId,
        weight: 'H',
        locked_at: lockedAt,
        locked_by: meUserId,
        locked_line_id: futureLine.id, // <- required by your types
        locked_spread_team_id: futureLine.spread_team_id,
        locked_spread_value: futureLine.spread_value
      },
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: otherUserId,
        game_id: futureGameId,
        picked_team_id: awayTeamId,
        locked_by: otherUserId,
        weight: 'M',
        locked_at: lockedAt,
        locked_line_id: futureLine.id,
        locked_spread_team_id: futureLine.spread_team_id,
        locked_spread_value: futureLine.spread_value
      },
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: meUserId,
        game_id: startedGameId,
        picked_team_id: homeTeamId,
        locked_by: meUserId,
        weight: 'L',
        locked_at: lockedAt,
        locked_line_id: startedLine.id,
        locked_spread_team_id: startedLine.spread_team_id,
        locked_spread_value: startedLine.spread_value
      },
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: otherUserId,
        game_id: startedGameId,
        locked_by: otherUserId,
        picked_team_id: startedAwayId,
        weight: 'A',
        locked_at: lockedAt,
        locked_line_id: startedLine.id,
        locked_spread_team_id: startedLine.spread_team_id,
        locked_spread_value: startedLine.spread_value
      }
    ]);
    if (pErr) throw new Error(`insert picks: ${pErr.message}`);
  });

  afterAll(async () => {
    // Best-effort cleanup
    await admin.from('picks').delete().in('game_id', [futureGameId, startedGameId]);
    await admin.from('game_lines').delete().in('game_id', [futureGameId, startedGameId]);
    await admin.from('games').delete().in('id', [futureGameId, startedGameId]);
  });

  it('throws when not authenticated', async () => {
    const event = makeEventUnauthed();
    await expect(listWeekGamesWithPicks(event, weekId)).rejects.toThrow(/not authenticated/i);
  });

  it('throws when week does not exist', async () => {
    const event = makeEventWithUser(meUserId);
    await expect(listWeekGamesWithPicks(event, 999999)).rejects.toThrow(/week not found/i);
  });

  it('returns games with active line + visibility rules enforced', async () => {
    const event = makeEventWithUser(meUserId);
    const data = await listWeekGamesWithPicks(event, weekId);

    // Should include both games we created
    const ids = data.map((g) => g.id);
    expect(ids).toContain(futureGameId);
    expect(ids).toContain(startedGameId);

    // Validate DTO shape + line fields for each
    for (const g of data) {
      expect(typeof g.commenceTime).toBe('string');
      expect(['scheduled', 'in_progress', 'final', null, undefined]).toContain(g.status);
      expect(g.home?.id).toBeTypeOf('number');
      expect(g.away?.id).toBeTypeOf('number');

      // Active line should be present and shaped
      expect(g.line?.spreadTeamId).toBeTypeOf('number');
      expect(g.line?.spreadValue).toBeTypeOf('number');
      expect(typeof g.line?.source).toBe('string');
      // fetchedAt may be null if query omits it; your code tolerates null
      if (g.line?.fetchedAt) {
        expect(typeof g.line.fetchedAt).toBe('string');
      }
    }

    // FUTURE GAME: only my pick visible
    const future = data.find((g) => g.id === futureGameId)!;
    expect(future.started).toBe(false);
    expect(future.picks.length).toBe(1);
    const myFuturePick = future.picks[0];
    expect(myFuturePick.isMe).toBe(true);
    expect(myFuturePick.userId).toBe(meUserId);
    expect(['L', 'M', 'H', 'A']).toContain(myFuturePick.weight);
    // displayName is mapped from picked_team_short in your code
    expect(typeof myFuturePick.displayName).toBe('string');
    expect(myFuturePick.lockedAt).toBeTruthy();

    // STARTED GAME: both users visible
    const started = data.find((g) => g.id === startedGameId)!;
    expect(started.started).toBe(true);
    // We inserted 2 picks for this game
    expect(started.picks.length).toBe(2);
    const meRow = started.picks.find((p) => p.userId === meUserId)!;
    const otherRow = started.picks.find((p) => p.userId === otherUserId)!;
    expect(meRow.isMe).toBe(true);
    expect(otherRow.isMe).toBe(false);
    expect(['L', 'M', 'H', 'A']).toContain(meRow.weight!);
    expect(['L', 'M', 'H', 'A']).toContain(otherRow.weight!);
    expect(meRow.lockedAt).toBeTruthy();
    expect(otherRow.lockedAt).toBeTruthy();
  });

  it('honors kickoff change: switching a future game to started reveals all picks', async () => {
    // Flip the future game kickoff into the past
    const past = new Date(Date.now() - 60_000).toISOString();
    const { error: updErr } = await admin
      .from('games')
      .update({ commence_time: past })
      .eq('id', futureGameId);
    expect(updErr).toBeNull();

    const event = makeEventWithUser(meUserId);
    const data = await listWeekGamesWithPicks(event, weekId);
    const futNowStarted = data.find((g) => g.id === futureGameId)!;
    expect(futNowStarted.started).toBe(true);
    // now both picks visible
    expect(futNowStarted.picks.length).toBe(2);
    const userIds = futNowStarted.picks.map((p) => p.userId);
    expect(userIds).toContain(meUserId);
    expect(userIds).toContain(otherUserId);
  });
});
