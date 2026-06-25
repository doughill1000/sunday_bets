import type { HeadToHeadEntry, SeasonTrendEntry } from '$lib/types/server/stats';

export type TrendPoint = {
  week_number: number;
  cumulative_points: number;
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
      cumulative_points: row.cumulative_points
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
 * `stats_head_to_head` stores one directional row per pair (right.user_id > left.user_id),
 * so a given user appears as either the subject or the opponent. Normalize every relevant row
 * to the selected user's perspective, flipping wins/losses and points where they were the opponent.
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
