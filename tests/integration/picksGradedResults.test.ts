/**
 * picksGradedResults.test.ts
 *
 * Integration cover for the two reads the picks loader gained in #823, so a completed game on
 * `/picks` can show its final score and the caller's settled outcome without a live feed.
 *
 * The bug was that neither existed: `ui_games` carries no grading columns and the loader never
 * touched `pick_settlement`, so the board's only score source was the live ESPN payload — which
 * ages out with its window (#822), leaving a graded game rendering a bare "⏱ Kicked off".
 *
 * Fixture ownership: season 2099 / week 10 (owned by seedTwoGroupSettlements) — a game with
 * `final_scores` already set and graded settlements in two groups for a shared user.
 */

import { describe, beforeAll, it, expect } from 'vitest';
import { createServiceClient } from './_auth';
import { seedTwoGroupSettlements, type TwoGroupSettlementsResult } from './fixtures/db';

import { getFinalScoresForWeek } from '$lib/server/db/queries/getFinalScoresForWeek';
import { getMySettlements } from '$lib/server/db/queries/getMySettlements';

const admin = createServiceClient();

let fx: TwoGroupSettlementsResult;

beforeAll(async () => {
  fx = await seedTwoGroupSettlements(admin);
}, 60_000);

describe('getFinalScoresForWeek', () => {
  it('returns the graded final score for a settled game', async () => {
    const scores = await getFinalScoresForWeek(fx.weekId);
    expect(scores[fx.gameId]).toEqual({ home: 34, away: 24 });
  });

  // `final_scores` is written only by grading, so presence IS the settled signal the board's
  // graded tier keys off. An ungraded game must be absent, not `{home: 0, away: 0}` — a zeroed
  // entry would read as "graded 0–0" and light the graded row on a game nobody has played.
  it('omits an ungraded game entirely rather than reporting a zeroed score', async () => {
    const { data: ungraded, error } = await admin
      .from('games')
      .insert({
        week_id: fx.weekId,
        home_team_id: fx.awayTeamId,
        away_team_id: fx.homeTeamId,
        external_game_id: 'picks-graded-results-ungraded-v1',
        commence_time: '2099-09-06T18:00:00Z',
        status: 'scheduled'
      })
      .select('id')
      .single();
    if (error && !error.message.includes('duplicate')) throw error;

    const scores = await getFinalScoresForWeek(fx.weekId);
    expect(scores[fx.gameId]).toBeDefined();
    if (ungraded) expect(scores[ungraded.id]).toBeUndefined();
  });

  it('is empty for a week with nothing graded', async () => {
    expect(await getFinalScoresForWeek(-1)).toEqual({});
  });
});

describe('getMySettlements', () => {
  it('returns the caller s own settled outcome and points swing', async () => {
    const mine = await getMySettlements([fx.gameId], fx.groupAId, fx.sharedUserId);
    expect(mine[fx.gameId]?.outcome).toBe('win');
    expect(mine[fx.gameId]?.pointsDelta).toBeGreaterThan(0);
  });

  // The same user, the same game, a different group — a different settled result. Scoping to
  // the group is what keeps the picks board honest for a multi-group member.
  it('is scoped to the group, so a divergent result in another group does not bleed in', async () => {
    const inB = await getMySettlements([fx.gameId], fx.groupBId, fx.sharedUserId);
    expect(inB[fx.gameId]?.outcome).toBe('loss');
  });

  // The read runs as service role (settlements only exist post-kickoff, so there is nothing
  // unrevealed to protect), which means the `user_id` filter is the ONLY thing standing between
  // the caller and the whole group's outcomes.
  it('never returns another member s row', async () => {
    const mine = await getMySettlements([fx.gameId], fx.groupAId, fx.sharedUserId);
    const theirs = await getMySettlements([fx.gameId], fx.groupAId, fx.exclusiveUserAId);
    // Both members exist and are settled in group A…
    expect(Object.keys(mine)).toHaveLength(1);
    expect(Object.keys(theirs)).toHaveLength(1);
    // …but a member who isn't in group A gets nothing from it.
    expect(await getMySettlements([fx.gameId], fx.groupAId, fx.exclusiveUserBId)).toEqual({});
  });

  it('short-circuits for an anonymous caller or an empty game list', async () => {
    expect(await getMySettlements([fx.gameId], fx.groupAId, null)).toEqual({});
    expect(await getMySettlements([], fx.groupAId, fx.sharedUserId)).toEqual({});
  });
});

// The two reads compose into exactly what the board's graded tier needs: a final score AND the
// caller's outcome for the same game id.
describe('the picks board s graded inputs, composed', () => {
  it('gives a completed game both a score and a resolved outcome', async () => {
    const [scores, settlements] = await Promise.all([
      getFinalScoresForWeek(fx.weekId),
      getMySettlements([fx.gameId], fx.groupAId, fx.sharedUserId)
    ]);

    expect(scores[fx.gameId]).toEqual({ home: 34, away: 24 });
    expect(settlements[fx.gameId]?.outcome).toBe('win');
  });
});
