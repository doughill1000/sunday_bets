import type {
  ConsensusStatsEntry,
  HeadToHeadEntry,
  LeagueSituationalBaselineEntry,
  LineSideStatsEntry,
  SeasonTrendEntry,
  SituationalDimension,
  SituationalSplitEntry,
  StreakStatsEntry
} from '$lib/types/server/stats';

export type TrendPoint = {
  week_number: number;
  cumulative_points: number;
  /** True for the single week drop-worst-week forgave from standings (ADR-0018). The line
   *  itself stays raw cumulative — this only flags which point to annotate. */
  is_dropped_week: boolean;
};

export type TrendSeries = {
  userId: string;
  displayName: string;
  points: TrendPoint[];
};

export function buildTrendSeries(rows: SeasonTrendEntry[]): TrendSeries[] {
  const grouped = new Map<string, TrendSeries>();

  for (const row of rows) {
    const series = grouped.get(row.user_id) ?? {
      userId: row.user_id,
      displayName: row.display_name,
      points: []
    };
    series.points.push({
      week_number: row.week_number,
      cumulative_points: row.cumulative_points,
      is_dropped_week: row.is_dropped_week
    });
    grouped.set(row.user_id, series);
  }

  return [...grouped.values()]
    .map((series) => ({
      ...series,
      points: series.points.toSorted((a, b) => a.week_number - b.week_number)
    }))
    .toSorted((a, b) => a.displayName.localeCompare(b.displayName));
}

/** One opponent's head-to-head record from the selected player's perspective. */
export type H2HRecord = {
  opponentUserId: string;
  opponentDisplayName: string;
  gamesCompared: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  opponentPoints: number;
};

/**
 * Head-to-head read models store one directional row per pair (right.user_id > left.user_id),
 * so a given user appears as either the subject or the opponent. Normalize every relevant
 * row to the selected user's perspective, flipping wins/losses and points where they were
 * the opponent.
 */
export function headToHeadForUser(rows: HeadToHeadEntry[], userId: string): H2HRecord[] {
  const records: H2HRecord[] = [];

  for (const row of rows) {
    if (row.user_id === userId) {
      records.push({
        opponentUserId: row.opponent_user_id,
        opponentDisplayName: row.opponent_display_name,
        gamesCompared: row.games_compared,
        wins: row.wins,
        losses: row.losses,
        pushes: row.pushes,
        points: row.points,
        opponentPoints: row.opponent_points
      });
    } else if (row.opponent_user_id === userId) {
      records.push({
        opponentUserId: row.user_id,
        opponentDisplayName: row.display_name,
        gamesCompared: row.games_compared,
        wins: row.losses,
        losses: row.wins,
        pushes: row.pushes,
        points: row.opponent_points,
        opponentPoints: row.points
      });
    }
  }

  return records.toSorted((a, b) => a.opponentDisplayName.localeCompare(b.opponentDisplayName));
}

export function formatAccuracy(accuracy: number | null): string {
  return accuracy == null ? '--' : `${Math.round(accuracy * 100)}%`;
}

// ── /stats scope selector (issue #518) ────────────────────────────────────────
// The Season/Career tab is gone: scope folds into one dropdown that pins the newest
// season ("This season") and Career, then lists older seasons newest-first. This derives
// that option model from the seasons that actually have data, so the control scales as
// years accumulate. Pure, so the ordering/scaling is unit-tested without a DOM.

export type SeasonScopeOptions = {
  /** Newest season with data — the pinned "This season" option; null when none exist. */
  latest: number | null;
  /** Older seasons, newest-first, listed beneath "This season" and "Career". */
  pastSeasons: number[];
};

export function seasonScopeOptions(availableSeasons: number[]): SeasonScopeOptions {
  const desc = [...new Set(availableSeasons)].sort((a, b) => b - a);
  return { latest: desc[0] ?? null, pastSeasons: desc.slice(1) };
}

// ── Personal tendency tiles (issue #502) ──────────────────────────────────────
// These surface the previously-latent per-user cuts already carried in the Stats payload
// (favorite/underdog line-side, win streak, consensus behavior) as compact, guarded tiles.
// Each derivation takes the row already matched to the selected player and returns a
// display-ready summary, or null when the season sample is too thin to be worth showing.

/**
 * Minimum placed picks before a tendency tile renders. The latent cuts are season-scoped, so
 * early in a season a player has only a handful of decisions — below this we withhold the tile
 * rather than headline something like "100% favorites" off two picks.
 */
export const TENDENCY_MIN_SAMPLE = 5;

/** Favorite-vs-underdog lean for the line-side tendency tile. */
export type LineSideTendency = {
  decisions: number;
  chalkPicks: number;
  dogPicks: number;
  /** Share of picks on the spread favorite (0–1). */
  favoritePct: number;
  /** Share of picks on the spread underdog (0–1). */
  underdogPct: number;
  /** Which way the player leans; 'balanced' when neither side clears the other by 10 points. */
  lean: 'favorites' | 'underdogs' | 'balanced';
};

export function lineSideTendency(
  entry: LineSideStatsEntry | undefined,
  minSample = TENDENCY_MIN_SAMPLE
): LineSideTendency | null {
  if (!entry || entry.decisions < minSample) return null;
  const favoritePct = entry.chalk_picks / entry.decisions;
  const underdogPct = entry.dog_picks / entry.decisions;
  const lean =
    Math.abs(favoritePct - underdogPct) < 0.1
      ? 'balanced'
      : favoritePct > underdogPct
        ? 'favorites'
        : 'underdogs';
  return {
    decisions: entry.decisions,
    chalkPicks: entry.chalk_picks,
    dogPicks: entry.dog_picks,
    favoritePct,
    underdogPct,
    lean
  };
}

/** Current/best win-streak summary for the streak tendency tile. */
export type StreakTendency = {
  current: number;
  best: number;
  gradedPicks: number;
};

export function streakTendency(
  entry: StreakStatsEntry | undefined,
  minSample = TENDENCY_MIN_SAMPLE
): StreakTendency | null {
  if (!entry || entry.graded_picks < minSample) return null;
  return { current: entry.current_streak, best: entry.max_streak, gradedPicks: entry.graded_picks };
}

/** Contrarian-vs-crowd summary for the consensus tendency tile. */
export type ConsensusTendency = {
  decisions: number;
  contrarianPicks: number;
  contrarianWins: number;
  /** Share of picks against the group majority (0–1). */
  contrarianPct: number;
  /** Share of picks with the group majority (0–1). */
  withCrowdPct: number;
};

export function consensusTendency(
  entry: ConsensusStatsEntry | undefined,
  minSample = TENDENCY_MIN_SAMPLE
): ConsensusTendency | null {
  if (!entry || entry.decisions < minSample) return null;
  return {
    decisions: entry.decisions,
    contrarianPicks: entry.contrarian_picks,
    contrarianWins: entry.contrarian_wins,
    contrarianPct: entry.contrarian_picks / entry.decisions,
    withCrowdPct: entry.majority_picks / entry.decisions
  };
}

// ── "Your edge" panel (issue #502, PR 2) ──────────────────────────────────────
// Joins a player's career situational cover rates (stats_situational_splits) to the league
// market baseline (league_situational_baseline) at the same backed-side grain, and surfaces the
// cuts where they most beat or trail the market. Career-first: the edge is meaningful day one off
// the imported seasons, and per-season situational samples are too thin to headline.

/**
 * Minimum decided picks (wins + losses, pushes excluded) in a single career cut before it can
 * headline as an edge. Higher than the season tendency guard because a "you beat the market here"
 * claim needs enough sample not to be noise, and career pools every season.
 */
export const EDGE_MIN_SAMPLE = 15;

/** Display label for each (dimension, bucket) pair the panel can surface. */
const EDGE_BUCKET_LABELS: Record<SituationalDimension, Record<string, string>> = {
  primetime: { primetime: 'In primetime', day: 'In daytime games' },
  home_away: { home: 'Backing the home side', away: 'Backing the road side' },
  spread: {
    pickem: "On pick'em games",
    '1-3': 'On short spreads (1–3)',
    '3.5-6.5': 'On mid spreads (3.5–6.5)',
    '7-9.5': 'On long spreads (7–9.5)',
    '10+': 'On double-digit spreads'
  },
  divisional: { divisional: 'In divisional games', non_divisional: 'In non-divisional games' }
};

/** One situational cut where the player's cover rate is compared to the market baseline. */
export type SituationalEdge = {
  dimension: SituationalDimension;
  bucket: string;
  /** Human label, e.g. "In primetime". */
  label: string;
  /** Decided picks in the cut (wins + losses; the sample the guard applies to). */
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  /** Player cover rate in this cut (0–1). */
  accuracy: number;
  /** League market cover rate for the same cut (0–1). */
  leagueAccuracy: number;
  /** accuracy − leagueAccuracy; positive = beating the market in this cut. */
  delta: number;
};

/**
 * Join one player's career situational splits to the league market baseline, keeping only the
 * cuts with a comparable baseline and enough decided picks, and return them strongest-signal
 * first (largest absolute distance from the market). Pushes never count toward the sample or the
 * rate. Pass `userSplits` already filtered to the selected player.
 */
export function situationalEdges(
  userSplits: SituationalSplitEntry[],
  leagueBaseline: LeagueSituationalBaselineEntry[],
  minSample = EDGE_MIN_SAMPLE
): SituationalEdge[] {
  const baselineByKey = new Map<string, number>();
  for (const b of leagueBaseline) {
    if (b.accuracy != null) baselineByKey.set(`${b.dimension}:${b.bucket}`, b.accuracy);
  }

  const edges: SituationalEdge[] = [];
  for (const s of userSplits) {
    const decided = s.wins + s.losses;
    if (decided < minSample || s.accuracy == null) continue;
    const leagueAccuracy = baselineByKey.get(`${s.dimension}:${s.bucket}`);
    if (leagueAccuracy == null) continue;
    const label = EDGE_BUCKET_LABELS[s.dimension]?.[s.bucket];
    if (!label) continue;
    edges.push({
      dimension: s.dimension,
      bucket: s.bucket,
      label,
      decisions: decided,
      wins: s.wins,
      losses: s.losses,
      pushes: s.pushes,
      accuracy: s.accuracy,
      leagueAccuracy,
      delta: s.accuracy - leagueAccuracy
    });
  }

  // Strongest edges first; deterministic tiebreak on sample size, then dimension/bucket.
  return edges.toSorted(
    (a, b) =>
      Math.abs(b.delta) - Math.abs(a.delta) ||
      b.decisions - a.decisions ||
      a.dimension.localeCompare(b.dimension) ||
      a.bucket.localeCompare(b.bucket)
  );
}

/**
 * Pick the panel's display set from {@link situationalEdges} output: the strongest edges, capped
 * at `limit`, with at most `perDimension` from any one dimension so the panel reads as a varied
 * synthesis rather than, say, four spread buckets. Assumes `edges` is already sorted by strength.
 */
export function topSituationalEdges(
  edges: SituationalEdge[],
  { limit = 4, perDimension = 2 }: { limit?: number; perDimension?: number } = {}
): SituationalEdge[] {
  const usedByDimension = new Map<SituationalDimension, number>();
  const picked: SituationalEdge[] = [];
  for (const edge of edges) {
    if (picked.length >= limit) break;
    const used = usedByDimension.get(edge.dimension) ?? 0;
    if (used >= perDimension) continue;
    usedByDimension.set(edge.dimension, used + 1);
    picked.push(edge);
  }
  return picked;
}

// ── Situational explorer (issue #514) ─────────────────────────────────────────
// The browsable counterpart to the "Your edge" hero: rather than only the top strongest cuts, it
// lays out EVERY bucket of a chosen dimension as a bar diverging from the league line, across
// Career or any Season. Career reuses the #502 career splits + baseline; Season uses the
// season-grained #514 views. Pure, so the layout + sample guard are unit-tested without a DOM.

/** The four dimensions the explorer's chip nav walks, in display order. */
export const EXPLORER_DIMENSIONS: SituationalDimension[] = [
  'primetime',
  'home_away',
  'spread',
  'divisional'
];

/** Chip labels for each dimension. */
export const EXPLORER_DIMENSION_LABELS: Record<SituationalDimension, string> = {
  primetime: 'Primetime',
  home_away: 'Home & away',
  spread: 'Spread',
  divisional: 'Divisional'
};

/** Short per-bucket labels for the explorer bars — the edge card uses fuller sentence labels. */
const EXPLORER_BUCKET_LABELS: Record<SituationalDimension, Record<string, string>> = {
  primetime: { primetime: 'Primetime', day: 'Daytime' },
  home_away: { home: 'Home side', away: 'Road side' },
  spread: {
    pickem: "Pick'em",
    '1-3': 'Short (1–3)',
    '3.5-6.5': 'Mid (3.5–6.5)',
    '7-9.5': 'Long (7–9.5)',
    '10+': 'Double-digit (10+)'
  },
  divisional: { divisional: 'Divisional', non_divisional: 'Non-divisional' }
};

/**
 * Decided picks a cut needs before its delta bar shows; below it the bucket dims to a "needs N
 * more" state instead of plotting noise. Same floor as the edge headline ({@link EDGE_MIN_SAMPLE}) —
 * a season lens of any one cut is deliberately often below it, which is why the edge stays career.
 */
export const EXPLORER_MIN_SAMPLE = EDGE_MIN_SAMPLE;

/** One bucket row within a dimension's explorer panel. */
export type ExplorerBucket = {
  dimension: SituationalDimension;
  bucket: string;
  /** Short display label, e.g. "Long (7–9.5)". */
  label: string;
  /** Decided picks (wins + losses; pushes excluded) — the sample the guard applies to. */
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  /** Player cover rate in this cut (0–1), null on a no-decision bucket. */
  accuracy: number | null;
  /** League market cover for the same cut (0–1), null when no comparable baseline. */
  leagueAccuracy: number | null;
  /** accuracy − leagueAccuracy; null when the bucket is thin or has no comparable baseline. */
  delta: number | null;
  /** True when there isn't enough sample (or no baseline) to trust a delta bar. */
  isThin: boolean;
  /** Decided picks still needed to clear the sample floor (0 once cleared). */
  needed: number;
};

/** One dimension's explorer panel: its chip label and every bucket the player has picks in. */
export type ExplorerDimension = {
  dimension: SituationalDimension;
  label: string;
  buckets: ExplorerBucket[];
};

/**
 * Lay out a player's situational splits for the explorer: for each dimension the player has picks
 * in, every bucket (ordered by magnitude/slot) joined to the league baseline, with a per-bucket
 * delta and a sample guard. Only dimensions with at least one labelled bucket are returned, so the
 * chip nav shows exactly the cuts with data. Pass `userSplits` already filtered to the selected
 * player and scope (career or the season in view); `leagueBaseline` at the matching scope.
 */
export function situationalExplorer(
  userSplits: SituationalSplitEntry[],
  leagueBaseline: LeagueSituationalBaselineEntry[],
  minSample = EXPLORER_MIN_SAMPLE
): ExplorerDimension[] {
  const baselineByKey = new Map<string, number>();
  for (const b of leagueBaseline) {
    if (b.accuracy != null) baselineByKey.set(`${b.dimension}:${b.bucket}`, b.accuracy);
  }

  return EXPLORER_DIMENSIONS.flatMap((dimension) => {
    const buckets = userSplits
      .filter((s) => s.dimension === dimension)
      .toSorted((a, b) => a.bucket_order - b.bucket_order)
      .flatMap((s): ExplorerBucket[] => {
        const label = EXPLORER_BUCKET_LABELS[dimension]?.[s.bucket];
        if (!label) return [];
        const decided = s.wins + s.losses;
        const leagueAccuracy = baselineByKey.get(`${dimension}:${s.bucket}`) ?? null;
        // A bar needs enough decided picks AND a comparable market line; otherwise it dims.
        const comparable = decided >= minSample && s.accuracy != null && leagueAccuracy != null;
        return [
          {
            dimension,
            bucket: s.bucket,
            label,
            decisions: decided,
            wins: s.wins,
            losses: s.losses,
            pushes: s.pushes,
            accuracy: s.accuracy,
            leagueAccuracy,
            delta: comparable ? (s.accuracy as number) - leagueAccuracy : null,
            isThin: !comparable,
            needed: Math.max(0, minSample - decided)
          }
        ];
      });
    return buckets.length > 0
      ? [{ dimension, label: EXPLORER_DIMENSION_LABELS[dimension], buckets }]
      : [];
  });
}
