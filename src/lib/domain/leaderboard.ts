// Pure dense-rank helper for the All-time leaderboard (#376).
//
// `stats_alltime_totals` has no `rank` column (unlike `leaderboard_season_totals`, which
// computes rank in SQL per ADR-0013) — ranking is computed here in the read model instead of
// a schema change, using the same ordering tuple as the season standings:
// `total_points desc, wins desc, pushes desc`. Ties share a rank (dense rank, not competition
// rank) — the next distinct tuple advances by exactly 1, regardless of how many rows tied.
export type AllTimeRankInput = {
  total_points: number;
  wins: number;
  pushes: number;
};

export function denseRankAllTime<T extends AllTimeRankInput>(
  entries: T[]
): (T & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) => b.total_points - a.total_points || b.wins - a.wins || b.pushes - a.pushes
  );

  let rank = 0;
  let prevTuple: string | null = null;
  return sorted.map((entry) => {
    const tuple = `${entry.total_points}|${entry.wins}|${entry.pushes}`;
    if (tuple !== prevTuple) {
      rank += 1;
      prevTuple = tuple;
    }
    return { ...entry, rank };
  });
}
