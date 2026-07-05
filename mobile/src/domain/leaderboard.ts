// Client-side season standings. The web app reads the leaderboard_season_totals
// materialized view through a service-role-only RPC (ADR-0002: the matview holds every
// group's rows and carries no RLS), so a direct-to-Supabase mobile client cannot use it.
// Instead we aggregate the group's own pick_settlement rows — which ARE readable to
// members under RLS — with logic that mirrors the matview SQL 1:1:
//   * raw_total = sum(points_delta) over scoring weeks
//   * record (W/L/push/missed) counts every decision, even a later-dropped week
//   * drop-worst-week (ADR-0018): when active for (group, season) and the player has
//     2+ settled weeks, subtract their single lowest week's points from the total
//   * rank = dense rank over (total_points desc, wins desc, pushes desc)
// Keep this in sync with supabase/src/views/leaderboard_season_totals.sql.
import { isDropWorstWeekActive, type DropWorstWeekRules } from './scoring';
import type { PickOutcome, StandingsRow } from './types';

/** One settled decision, already filtered to scoring weeks of a single season+group. */
export type SettlementFact = {
  userId: string;
  weekId: number;
  pointsDelta: number;
  outcome: PickOutcome | null;
};

export type UserMeta = { displayName: string | null; avatarKey: string | null };

export function aggregateSeasonStandings(
  facts: SettlementFact[],
  users: Map<string, UserMeta>,
  rules: DropWorstWeekRules,
  seasonYear: number
): StandingsRow[] {
  type Acc = {
    rawTotal: number;
    decisions: number;
    wins: number;
    losses: number;
    pushes: number;
    missed: number;
    weekPoints: Map<number, number>;
  };
  const byUser = new Map<string, Acc>();

  for (const f of facts) {
    let acc = byUser.get(f.userId);
    if (!acc) {
      acc = {
        rawTotal: 0,
        decisions: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        missed: 0,
        weekPoints: new Map()
      };
      byUser.set(f.userId, acc);
    }
    acc.rawTotal += f.pointsDelta;
    acc.decisions += 1;
    if (f.outcome === 'win') acc.wins += 1;
    else if (f.outcome === 'loss') acc.losses += 1;
    else if (f.outcome === 'push') acc.pushes += 1;
    else if (f.outcome === 'missed') acc.missed += 1;
    acc.weekPoints.set(f.weekId, (acc.weekPoints.get(f.weekId) ?? 0) + f.pointsDelta);
  }

  const dropActive = isDropWorstWeekActive(rules, seasonYear);

  const rows: StandingsRow[] = [...byUser.entries()].map(([userId, acc]) => {
    const weeksPlayed = acc.weekPoints.size;
    const lowestWeekPoints = weeksPlayed > 0 ? Math.min(...acc.weekPoints.values()) : 0;
    const dropped = dropActive && weeksPlayed >= 2;
    const meta = users.get(userId);
    return {
      userId,
      displayName: meta?.displayName ?? 'Unknown player',
      avatarKey: meta?.avatarKey ?? null,
      rawTotal: acc.rawTotal,
      droppedWeekPoints: dropped ? lowestWeekPoints : null,
      totalPoints: dropped ? acc.rawTotal - lowestWeekPoints : acc.rawTotal,
      decisions: acc.decisions,
      wins: acc.wins,
      losses: acc.losses,
      pushes: acc.pushes,
      missed: acc.missed,
      rank: 0 // assigned below
    };
  });

  // Display order mirrors the matview's ORDER BY (user_id desc as the deterministic
  // tie-breaker); rank is a dense rank over (total_points, wins, pushes).
  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.wins - a.wins ||
      b.pushes - a.pushes ||
      (a.userId > b.userId ? -1 : a.userId < b.userId ? 1 : 0)
  );
  let rank = 0;
  let prev: StandingsRow | null = null;
  for (const row of rows) {
    if (
      !prev ||
      prev.totalPoints !== row.totalPoints ||
      prev.wins !== row.wins ||
      prev.pushes !== row.pushes
    ) {
      rank += 1;
    }
    row.rank = rank;
    prev = row;
  }
  return rows;
}
