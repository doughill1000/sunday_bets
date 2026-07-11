import type {
  ConsensusStatsEntry,
  HeadToHeadEntry,
  LineSideStatsEntry,
  SeasonTrendEntry,
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
