import { describe, expect, it } from 'vitest';
import {
  buildTrendSeries,
  consensusTendency,
  EDGE_MIN_SAMPLE,
  formatAccuracy,
  headToHeadForUser,
  lineSideTendency,
  situationalEdges,
  streakTendency,
  TENDENCY_MIN_SAMPLE,
  topSituationalEdges
} from '../stats';
import type {
  ConsensusStatsEntry,
  HeadToHeadEntry,
  LeagueSituationalBaselineEntry,
  LineSideStatsEntry,
  SeasonTrendEntry,
  SituationalSplitEntry,
  StreakStatsEntry
} from '$lib/types/server/stats';

const trendRow = (
  user_id: string,
  display_name: string,
  week_number: number,
  cumulative_points: number
): SeasonTrendEntry => ({
  user_id,
  display_name,
  season_year: 2026,
  week_number,
  week_points: cumulative_points,
  week_wins: 1,
  week_losses: 0,
  week_pushes: 0,
  week_missed: 0,
  is_dropped_week: false,
  cumulative_points,
  season_total: cumulative_points,
  cumulative_rank_this_week: 1
});

const h2hRow = (
  overrides: Pick<
    HeadToHeadEntry,
    | 'user_id'
    | 'display_name'
    | 'opponent_user_id'
    | 'opponent_display_name'
    | 'wins'
    | 'losses'
    | 'pushes'
    | 'points'
    | 'opponent_points'
  >
): HeadToHeadEntry => ({
  games_compared: overrides.wins + overrides.losses + overrides.pushes,
  ...overrides
});

describe('stats utilities', () => {
  it('groups trend rows by player and sorts players and weeks', () => {
    const result = buildTrendSeries([
      trendRow('b', 'Beth', 2, 4),
      trendRow('a', 'Alex', 2, 6),
      trendRow('b', 'Beth', 1, 1),
      trendRow('a', 'Alex', 1, 3)
    ]);

    expect(result.map((series) => series.displayName)).toEqual(['Alex', 'Beth']);
    expect(result[1].points).toEqual([
      { week_number: 1, cumulative_points: 1, is_dropped_week: false },
      { week_number: 2, cumulative_points: 4, is_dropped_week: false }
    ]);
  });

  it('threads the dropped-week flag onto trend points', () => {
    const droppedRow = trendRow('a', 'Alex', 3, 9);
    const result = buildTrendSeries([
      trendRow('a', 'Alex', 1, 3),
      { ...droppedRow, is_dropped_week: true },
      trendRow('a', 'Alex', 2, 6)
    ]);

    expect(result[0].points.map((p) => p.is_dropped_week)).toEqual([false, false, true]);
  });

  it('formats accuracy', () => {
    expect(formatAccuracy(0.6667)).toBe('67%');
    expect(formatAccuracy(null)).toBe('--');
  });

  it('normalizes head-to-head rows to the selected user, flipping the opponent direction', () => {
    const rows: HeadToHeadEntry[] = [
      // Alex is the subject vs Beth: 3-1, 12 to 5 pts
      h2hRow({
        user_id: 'a',
        display_name: 'Alex',
        opponent_user_id: 'b',
        opponent_display_name: 'Beth',
        wins: 3,
        losses: 1,
        pushes: 0,
        points: 12,
        opponent_points: 5
      }),
      // Cara is the subject vs Alex: 2-4, 8 to 15 pts -> from Alex's view should flip to 4-2, 15 to 8
      h2hRow({
        user_id: 'c',
        display_name: 'Cara',
        opponent_user_id: 'a',
        opponent_display_name: 'Alex',
        wins: 2,
        losses: 4,
        pushes: 1,
        points: 8,
        opponent_points: 15
      }),
      // Unrelated pair should be ignored
      h2hRow({
        user_id: 'b',
        display_name: 'Beth',
        opponent_user_id: 'c',
        opponent_display_name: 'Cara',
        wins: 1,
        losses: 1,
        pushes: 0,
        points: 4,
        opponent_points: 4
      })
    ];

    const result = headToHeadForUser(rows, 'a');

    // Sorted by opponent display name: Beth then Cara
    expect(result.map((r) => r.opponentDisplayName)).toEqual(['Beth', 'Cara']);

    expect(result[0]).toMatchObject({
      opponentUserId: 'b',
      wins: 3,
      losses: 1,
      pushes: 0,
      points: 12,
      opponentPoints: 5
    });

    // Flipped row: Alex was the opponent of Cara
    expect(result[1]).toMatchObject({
      opponentUserId: 'c',
      wins: 4,
      losses: 2,
      pushes: 1,
      points: 15,
      opponentPoints: 8
    });
  });
});

const lineSideEntry = (over: Partial<LineSideStatsEntry> = {}): LineSideStatsEntry => ({
  user_id: 'a',
  display_name: 'Alex',
  decisions: 10,
  chalk_picks: 6,
  dog_picks: 4,
  ...over
});

const streakEntry = (over: Partial<StreakStatsEntry> = {}): StreakStatsEntry => ({
  user_id: 'a',
  display_name: 'Alex',
  graded_picks: 12,
  current_streak: 3,
  max_streak: 7,
  ...over
});

const consensusEntry = (over: Partial<ConsensusStatsEntry> = {}): ConsensusStatsEntry => ({
  user_id: 'a',
  display_name: 'Alex',
  decisions: 10,
  mean_consensus_pct: 55,
  contrarian_picks: 4,
  contrarian_wins: 3,
  majority_picks: 6,
  majority_wins: 4,
  ...over
});

describe('tendency tiles (#502)', () => {
  it('withholds the line-side tile for a missing or thin sample', () => {
    expect(lineSideTendency(undefined)).toBeNull();
    expect(
      lineSideTendency(
        lineSideEntry({ decisions: TENDENCY_MIN_SAMPLE - 1, chalk_picks: 2, dog_picks: 1 })
      )
    ).toBeNull();
  });

  it('computes favorite/underdog share and lean', () => {
    const favorites = lineSideTendency(
      lineSideEntry({ decisions: 10, chalk_picks: 7, dog_picks: 2 })
    );
    expect(favorites).toMatchObject({ favoritePct: 0.7, underdogPct: 0.2, lean: 'favorites' });

    const dogs = lineSideTendency(lineSideEntry({ decisions: 10, chalk_picks: 2, dog_picks: 7 }));
    expect(dogs?.lean).toBe('underdogs');

    // Within 10 points either way reads as balanced (0.50 favorites vs 0.45 underdogs).
    const balanced = lineSideTendency(
      lineSideEntry({ decisions: 20, chalk_picks: 10, dog_picks: 9 })
    );
    expect(balanced?.lean).toBe('balanced');
  });

  it('withholds the streak tile below the graded-pick guard', () => {
    expect(streakTendency(undefined)).toBeNull();
    expect(streakTendency(streakEntry({ graded_picks: TENDENCY_MIN_SAMPLE - 1 }))).toBeNull();
  });

  it('summarizes current and best streak', () => {
    expect(
      streakTendency(streakEntry({ graded_picks: 12, current_streak: 3, max_streak: 7 }))
    ).toEqual({ current: 3, best: 7, gradedPicks: 12 });
  });

  it('withholds the consensus tile for a missing or thin sample', () => {
    expect(consensusTendency(undefined)).toBeNull();
    expect(consensusTendency(consensusEntry({ decisions: TENDENCY_MIN_SAMPLE - 1 }))).toBeNull();
  });

  it('computes contrarian and with-crowd share', () => {
    const tendency = consensusTendency(
      consensusEntry({ decisions: 10, contrarian_picks: 4, contrarian_wins: 3, majority_picks: 6 })
    );
    expect(tendency).toMatchObject({
      contrarianPct: 0.4,
      withCrowdPct: 0.6,
      contrarianPicks: 4,
      contrarianWins: 3
    });
  });
});

const split = (
  dimension: SituationalSplitEntry['dimension'],
  bucket: string,
  wins: number,
  losses: number,
  over: Partial<SituationalSplitEntry> = {}
): SituationalSplitEntry => ({
  user_id: 'a',
  dimension,
  bucket,
  bucket_order: 0,
  decisions: wins + losses,
  wins,
  losses,
  pushes: 0,
  accuracy: wins + losses > 0 ? wins / (wins + losses) : null,
  ...over
});

const baseline = (
  dimension: SituationalSplitEntry['dimension'],
  bucket: string,
  accuracy: number | null
): LeagueSituationalBaselineEntry => ({
  dimension,
  bucket,
  bucket_order: 0,
  decisions: 100,
  wins: 50,
  losses: 50,
  pushes: 0,
  accuracy
});

describe('situational edges (#502)', () => {
  const league = [
    baseline('home_away', 'home', 0.5),
    baseline('spread', '10+', 0.5),
    baseline('primetime', 'primetime', 0.5)
  ];

  it('withholds a cut below the decided-pick guard (pushes never count)', () => {
    // 14 decided + 20 pushes still fails the guard of 15 decided picks.
    const thin = split('home_away', 'home', 9, 5, { pushes: 20 });
    expect(situationalEdges([thin], league)).toEqual([]);
  });

  it('drops cuts with no comparable baseline or no known label', () => {
    const noBaseline = split('divisional', 'divisional', 20, 10); // not in `league`
    const unknownBucket = split('spread', 'weird-bucket', 20, 10); // no label
    expect(
      situationalEdges(
        [noBaseline, unknownBucket],
        [...league, baseline('spread', 'weird-bucket', 0.5)]
      )
    ).toEqual([]);
  });

  it('computes the delta vs league and ranks by absolute distance from the market', () => {
    const edges = situationalEdges(
      [
        split('home_away', 'home', 24, 16), // 0.60 -> +0.10
        split('spread', '10+', 10, 20), // 0.3333 -> -0.1667 (strongest)
        split('primetime', 'primetime', 22, 18) // 0.55 -> +0.05
      ],
      league
    );

    expect(edges.map((e) => e.dimension)).toEqual(['spread', 'home_away', 'primetime']);
    expect(edges[0]).toMatchObject({ bucket: '10+', label: 'On double-digit spreads', wins: 10 });
    expect(edges[0].delta).toBeCloseTo(-0.1667, 4);
    expect(edges[1].delta).toBeCloseTo(0.1, 4);
    expect(edges[2].delta).toBeCloseTo(0.05, 4);
  });
});

describe('top situational edges (#502)', () => {
  const league = [
    baseline('spread', '1-3', 0.5),
    baseline('spread', '3.5-6.5', 0.5),
    baseline('spread', '7-9.5', 0.5),
    baseline('home_away', 'home', 0.5),
    baseline('primetime', 'primetime', 0.5)
  ];
  const edges = situationalEdges(
    [
      split('spread', '1-3', 30, 10), // +0.25, 40 decided
      split('spread', '3.5-6.5', 8, 24), // -0.25, 32 decided
      split('spread', '7-9.5', 24, 16), // +0.10
      split('home_away', 'home', 22, 18), // +0.05
      split('primetime', 'primetime', 21, 19) // +0.025
    ],
    league
  );

  it('caps how many cuts come from any one dimension so the panel stays varied', () => {
    const top = topSituationalEdges(edges); // default limit 4, perDimension 2
    expect(top.map((e) => `${e.dimension}:${e.bucket}`)).toEqual([
      'spread:1-3',
      'spread:3.5-6.5',
      'home_away:home',
      'primetime:primetime'
    ]);
    // The third spread bucket is dropped by the per-dimension cap, not just the limit.
    expect(top.some((e) => e.bucket === '7-9.5')).toBe(false);
  });

  it('honors the limit', () => {
    expect(topSituationalEdges(edges, { limit: 2 }).map((e) => e.bucket)).toEqual([
      '1-3',
      '3.5-6.5'
    ]);
  });

  it('exposes a tunable career sample guard', () => {
    expect(EDGE_MIN_SAMPLE).toBeGreaterThanOrEqual(10);
  });
});
