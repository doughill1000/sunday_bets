import { describe, expect, it } from 'vitest';
import {
  buildTrendSeries,
  consensusTendency,
  EDGE_MIN_SAMPLE,
  EXPLORER_MIN_SAMPLE,
  formatAccuracy,
  headToHeadForUser,
  lineSideTendency,
  seasonScopeOptions,
  signatureTendencies,
  SIGNATURE_LEAN_MIN_SAMPLE,
  situationalEdges,
  situationalExplorer,
  streakTendency,
  TEAM_BOOK_MIN_SAMPLE,
  teamBookStandouts,
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
  StreakStatsEntry,
  TeamBookEntry,
  TeamBookSide
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

describe('seasonScopeOptions (#518, #638)', () => {
  it('pins the newest season as "This season" and lists the rest newest-first', () => {
    expect(seasonScopeOptions([2022, 2025, 2023, 2024], true)).toEqual({
      latest: 2025,
      pastSeasons: [2024, 2023, 2022]
    });
  });

  it('leaves no past seasons when only one season has data', () => {
    expect(seasonScopeOptions([2025], true)).toEqual({ latest: 2025, pastSeasons: [] });
  });

  it('returns a null latest when no seasons have data, regardless of latestInProgress', () => {
    expect(seasonScopeOptions([], true)).toEqual({ latest: null, pastSeasons: [] });
    expect(seasonScopeOptions([], false)).toEqual({ latest: null, pastSeasons: [] });
  });

  it('dedupes repeated seasons', () => {
    expect(seasonScopeOptions([2024, 2024, 2023], true)).toEqual({
      latest: 2024,
      pastSeasons: [2023]
    });
  });

  it('folds the newest season into pastSeasons instead of pinning it once it has concluded', () => {
    expect(seasonScopeOptions([2022, 2025, 2023, 2024], false)).toEqual({
      latest: null,
      pastSeasons: [2025, 2024, 2023, 2022]
    });
  });

  it('folds a single concluded season into pastSeasons rather than pinning it', () => {
    expect(seasonScopeOptions([2025], false)).toEqual({ latest: null, pastSeasons: [2025] });
  });

  it('does not mutate the caller’s array', () => {
    const input = [2023, 2025, 2024];
    seasonScopeOptions(input, true);
    expect(input).toEqual([2023, 2025, 2024]);
  });
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

describe('situational explorer (#514)', () => {
  const league = [
    baseline('spread', 'pickem', 0.5),
    baseline('spread', '1-3', 0.49),
    baseline('spread', '7-9.5', 0.53),
    baseline('primetime', 'primetime', 0.5)
  ];

  it('lays out a dimension’s buckets in order with per-bucket deltas vs the league line', () => {
    const dims = situationalExplorer(
      [
        split('spread', '7-9.5', 35, 19, { bucket_order: 3 }), // 0.6481 -> +0.118
        split('spread', 'pickem', 22, 15, { bucket_order: 0 }) // 0.5946 -> +0.0946
      ],
      league
    );
    expect(dims).toHaveLength(1);
    expect(dims[0].dimension).toBe('spread');
    // Ordered by bucket_order, not input order; short bucket labels.
    expect(dims[0].buckets.map((b) => b.bucket)).toEqual(['pickem', '7-9.5']);
    expect(dims[0].buckets[0].label).toBe("Pick'em");
    expect(dims[0].buckets[0].isThin).toBe(false);
    expect(dims[0].buckets[0].delta).toBeCloseTo(0.0946, 3);
    expect(dims[0].buckets[1].delta).toBeCloseTo(0.1181, 3);
  });

  it('dims a thin cut: no delta bar, still shows the record, reports how many more picks it needs', () => {
    const [dim] = situationalExplorer(
      [split('spread', '1-3', 6, 3, { bucket_order: 1 })], // 9 decided < 15
      league
    );
    const bucket = dim.buckets[0];
    expect(bucket.isThin).toBe(true);
    expect(bucket.delta).toBeNull();
    expect(bucket.needed).toBe(EXPLORER_MIN_SAMPLE - 9);
    expect(bucket.accuracy).toBeCloseTo(6 / 9, 4);
  });

  it('marks a well-sampled cut thin when it has no comparable market line', () => {
    const [dim] = situationalExplorer(
      [split('divisional', 'divisional', 20, 10)], // no divisional baseline provided
      league
    );
    expect(dim.buckets[0].isThin).toBe(true);
    expect(dim.buckets[0].delta).toBeNull();
    expect(dim.buckets[0].needed).toBe(0); // sample is fine; the baseline is what's missing
  });

  it('returns dimensions in display order and skips unlabelled buckets and empty dimensions', () => {
    const dims = situationalExplorer(
      [
        split('primetime', 'primetime', 20, 10, { bucket_order: 0 }),
        split('spread', 'weird', 20, 10, { bucket_order: 0 }) // unknown bucket -> dropped
      ],
      league
    );
    expect(dims.map((d) => d.dimension)).toEqual(['primetime']);
  });

  it('returns nothing when the player has no situational picks', () => {
    expect(situationalExplorer([], league)).toEqual([]);
  });
});

const teamBookEntry = (
  side: TeamBookSide,
  teamShort: string,
  wins: number,
  losses: number,
  over: Partial<TeamBookEntry> = {}
): TeamBookEntry => ({
  user_id: 'a',
  display_name: 'Alex',
  side,
  team_id: [...teamShort].reduce((sum, ch) => sum + ch.charCodeAt(0), 0),
  team_name: `${teamShort} Team`,
  team_short_name: teamShort,
  decisions: wins + losses,
  wins,
  losses,
  pushes: 0,
  points: wins - losses,
  accuracy: wins + losses > 0 ? wins / (wins + losses) : null,
  ...over
});

describe('team book standouts (#564)', () => {
  const entries = [
    teamBookEntry('backed', 'SF', 9, 2), // decided 11, cover .818
    teamBookEntry('backed', 'KC', 7, 3), // decided 10, cover .70
    teamBookEntry('backed', 'BUF', 2, 1), // decided 3 < 5 -> guarded out
    teamBookEntry('faded', 'DAL', 8, 1), // decided 9, cover .889
    teamBookEntry('faded', 'NYJ', 3, 6), // decided 9, cover .333
    teamBookEntry('faded', 'LV', 4, 0) // decided 4 < 5 -> guarded out
  ];

  it('splits into ride/fade, guards thin teams, ranks most-ridden/faded first', () => {
    const { ride, fade } = teamBookStandouts(entries);
    // Ride = backed side, by decided volume (SF 11 > KC 10); BUF (3 decided) is guarded out.
    expect(ride.map((t) => t.teamShort)).toEqual(['SF', 'KC']);
    // Fade = faded side; DAL and NYJ tie on volume (9), so cover breaks the tie (.889 > .333);
    // LV (4 decided) is guarded out.
    expect(fade.map((t) => t.teamShort)).toEqual(['DAL', 'NYJ']);
    expect(ride[0]).toMatchObject({ side: 'backed', wins: 9, losses: 2, decided: 11 });
    expect(ride[0].cover).toBeCloseTo(9 / 11, 4);
    expect(fade[0]).toMatchObject({ side: 'faded', teamShort: 'DAL' });
    expect(fade[0].cover).toBeCloseTo(8 / 9, 4);
  });

  it('honors the sample guard and the limit', () => {
    // Exactly at the guard passes; one below is dropped.
    const atGuard = teamBookStandouts([teamBookEntry('backed', 'SF', 3, 2)]); // decided 5
    expect(atGuard.ride).toHaveLength(1);
    const belowGuard = teamBookStandouts([teamBookEntry('backed', 'SF', 2, 2)]); // decided 4
    expect(belowGuard.ride).toHaveLength(0);
    expect(TEAM_BOOK_MIN_SAMPLE).toBe(5);

    const capped = teamBookStandouts(entries, { limit: 1 });
    expect(capped.ride.map((t) => t.teamShort)).toEqual(['SF']);
    expect(capped.fade.map((t) => t.teamShort)).toEqual(['DAL']);
  });
});

describe('signature tendencies (#564)', () => {
  const league = [baseline('primetime', 'primetime', 0.47)];
  // Player covers 58% in primetime vs a 47% market line -> +0.11 edge, 100 decided (clears guard).
  const edges = situationalEdges([split('primetime', 'primetime', 58, 42)], league);
  const teamBook = teamBookStandouts([
    teamBookEntry('backed', 'SF', 9, 2), // cover .818
    teamBookEntry('faded', 'DAL', 8, 1), // cover .889 (the most-notable ride/fade)
    teamBookEntry('faded', 'NYJ', 3, 6) // cover .333 -> below .500, never a signature tell
  ]);

  it('ranks a team tell, a lean, and a situational cut — strongest first, career-consistent', () => {
    const lineSide = lineSideTendency(
      lineSideEntry({ decisions: 100, chalk_picks: 39, dog_picks: 61 })
    );
    const tells = signatureTendencies({ edges, lineSide, teamBook });

    // DAL fade (|.889 - .5| = .389) outranks the underdog lean and the primetime edge (both .11);
    // at the .11 tie, the lean sorts ahead of the situational cut (kind priority).
    expect(tells.map((t) => t.kind)).toEqual(['team', 'lean', 'situational']);
    const [team, lean, sit] = tells;
    expect(team).toMatchObject({
      kind: 'team',
      side: 'faded',
      teamShort: 'DAL',
      wins: 8,
      losses: 1
    });
    if (team.kind === 'team') expect(team.cover).toBeCloseTo(8 / 9, 4);
    expect(lean).toMatchObject({ kind: 'lean', lean: 'underdogs' });
    if (lean.kind === 'lean') expect(lean.leanPct).toBeCloseTo(0.61, 4);
    expect(sit).toMatchObject({ kind: 'situational', dimension: 'primetime' });
    if (sit.kind === 'situational') expect(sit.delta).toBeCloseTo(0.11, 4);
  });

  it('omits the lean tell when the mix is balanced or the sample is thin', () => {
    const balanced = lineSideTendency(
      lineSideEntry({ decisions: 100, chalk_picks: 50, dog_picks: 50 })
    );
    expect(
      signatureTendencies({ edges: [], lineSide: balanced, teamBook: { ride: [], fade: [] } })
    ).toEqual([]);

    // Clearly leaning, but below the signature lean sample guard.
    const thin = lineSideTendency(
      lineSideEntry({
        decisions: SIGNATURE_LEAN_MIN_SAMPLE - 1,
        chalk_picks: 1,
        dog_picks: SIGNATURE_LEAN_MIN_SAMPLE - 2
      })
    );
    expect(
      signatureTendencies({ edges: [], lineSide: thin, teamBook: { ride: [], fade: [] } })
    ).toEqual([]);
  });

  it('never anchors a team tell on a losing side', () => {
    const losingOnly = teamBookStandouts([
      teamBookEntry('faded', 'NYJ', 3, 6), // .333
      teamBookEntry('backed', 'CHI', 4, 8) // .333
    ]);
    const tells = signatureTendencies({
      edges: [],
      lineSide: null,
      teamBook: losingOnly
    });
    expect(tells).toEqual([]);
  });

  it('never surfaces a situational cut where the player trails the market (beat-only)', () => {
    // Player covers 30% in primetime vs a .47 market line -> -0.17: a real weakness. The signature
    // strip is strengths-only (mirroring the team tell), so it must not headline; the two-sided
    // Every-split explorer owns "where you trail".
    const trailing = situationalEdges([split('primetime', 'primetime', 30, 70)], league);
    expect(trailing[0].delta).toBeLessThan(0);

    // Alone, the trailing cut yields an honest empty state rather than a negative headline.
    expect(
      signatureTendencies({ edges: trailing, lineSide: null, teamBook: { ride: [], fade: [] } })
    ).toEqual([]);

    // Alongside a winning ride, only the strength surfaces — the weakness is still dropped.
    const withRide = signatureTendencies({
      edges: trailing,
      lineSide: null,
      teamBook: teamBookStandouts([teamBookEntry('backed', 'SF', 9, 2)])
    });
    expect(withRide.map((t) => t.kind)).toEqual(['team']);
  });

  it('caps the situational cuts and never repeats a dimension', () => {
    const spreadLeague = [
      baseline('spread', '1-3', 0.5),
      baseline('spread', '3.5-6.5', 0.5),
      baseline('home_away', 'home', 0.5)
    ];
    const manyEdges = situationalEdges(
      [
        split('spread', '1-3', 30, 10), // +.25
        split('spread', '3.5-6.5', 28, 12), // +.20 (same dimension -> dropped)
        split('home_away', 'home', 26, 14) // +.15
      ],
      spreadLeague
    );
    const tells = signatureTendencies({
      edges: manyEdges,
      lineSide: null,
      teamBook: { ride: [], fade: [] }
    });
    // At most two situational tells, one per dimension: the top spread + home_away, not two spreads.
    expect(tells).toHaveLength(2);
    expect(tells.every((t) => t.kind === 'situational')).toBe(true);
    const situationalDims = tells.flatMap((t) => (t.kind === 'situational' ? [t.dimension] : []));
    expect(situationalDims).toEqual(['spread', 'home_away']);
    expect(new Set(situationalDims).size).toBe(situationalDims.length);
  });

  it('returns nothing when every feeder is empty or thin (honest empty state)', () => {
    expect(
      signatureTendencies({ edges: [], lineSide: null, teamBook: { ride: [], fade: [] } })
    ).toEqual([]);
  });
});
