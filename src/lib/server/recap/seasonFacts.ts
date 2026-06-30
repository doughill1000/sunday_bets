// SeasonWrappedFacts builder: pure, deterministic assembly of a season's year-in-review
// for the AI Season Wrapped (#347). The season edition of facts.ts — reads the same
// ADR-0013 matviews and #277 read-models, never writes. ADR-0008, boundary 2.
//
// Two neutralization rules satisfy "opted-out players appear only as neutral facts":
//   - player packets address the subject in the 2nd person, so their own stats are never
//     a third-party roast — no neutralization of self is needed;
//   - any third-party reference (a player's nemesis, every name in the league packet) is
//     neutralized to 'a player' when that player opted out.
import { computeBadges, badgeInputsFromSeasonStats } from '$lib/domain/badges';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { loadGroupMeta } from '$lib/server/recap/facts';
import type {
  SeasonWrappedFacts,
  SeasonWrappedSubject,
  PlayerWrappedFacts,
  LeagueWrappedFacts,
  WrappedNemesis,
  WrappedWeekExtreme,
  WrappedBadge,
  WrappedRankJourney,
  WrappedLeadSummary,
  WrappedHeater
} from '$lib/types/server/seasonWrapped';
import type { SeasonTrendEntry, StreakStatsEntry } from '$lib/types/server/stats';

// A nemesis needs enough shared games to be signal, not noise (cf. MIN_RIVALRY_GAMES).
const NEMESIS_MIN_GAMES = 4;

/** Replace an opted-out player's name with 'a player'; leave others untouched. */
function neutralizeName(displayName: string, userId: string, optedOut: Set<string>): string {
  return optedOut.has(userId) ? 'a player' : displayName;
}

// ── Season storyline selectors ─────────────────────────────────────────────────────
// Pure, deterministic season-long beats from the per-week trend + streak data. They each
// take the opted-out set and return display-name-only fact shapes (the season packet never
// carries user_id), so neutralization lives with the selector — mirroring nemesis/standings.

// A heater shorter than this isn't a story — matches the weekly hot-streak floor.
const MIN_SEASON_HEATER = 3;

type RankJourneyRow = {
  user_id: string;
  display_name: string;
  from_rank: number;
  to_rank: number;
  delta: number;
};

/** Each player's first-scoring-week rank → final rank (needs ≥2 weeks to be a journey). */
function rankJourneys(trend: SeasonTrendEntry[]): RankJourneyRow[] {
  const byUser = new Map<string, SeasonTrendEntry[]>();
  for (const r of trend) {
    const arr = byUser.get(r.user_id);
    if (arr) arr.push(r);
    else byUser.set(r.user_id, [r]);
  }
  const journeys: RankJourneyRow[] = [];
  for (const [userId, rows] of byUser) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort((a, b) => a.week_number - b.week_number);
    const from = sorted[0].cumulative_rank_this_week;
    const to = sorted[sorted.length - 1].cumulative_rank_this_week;
    journeys.push({
      user_id: userId,
      display_name: sorted[sorted.length - 1].display_name,
      from_rank: from,
      to_rank: to,
      delta: from - to // positive = climbed
    });
  }
  return journeys;
}

/** The season's biggest climber and biggest faller (by rank delta), opt-out neutralized. */
export function selectRankJourneys(
  trend: SeasonTrendEntry[],
  optedOut: Set<string>
): { biggest_climber: WrappedRankJourney | null; biggest_faller: WrappedRankJourney | null } {
  const journeys = rankJourneys(trend);
  const tie = (a: RankJourneyRow, b: RankJourneyRow) =>
    a.to_rank - b.to_rank ||
    a.display_name.localeCompare(b.display_name) ||
    a.user_id.localeCompare(b.user_id);
  const climber = journeys
    .filter((j) => j.delta > 0)
    .sort((a, b) => b.delta - a.delta || tie(a, b))[0];
  const faller = journeys
    .filter((j) => j.delta < 0)
    .sort((a, b) => a.delta - b.delta || tie(a, b))[0];
  const toFact = (j: RankJourneyRow): WrappedRankJourney => ({
    display_name: neutralizeName(j.display_name, j.user_id, optedOut),
    from_rank: j.from_rank,
    to_rank: j.to_rank,
    delta: j.delta
  });
  return {
    biggest_climber: climber ? toFact(climber) : null,
    biggest_faller: faller ? toFact(faller) : null
  };
}

/** The ordered #1-holder per scoring week (deterministic tie-break on display name). */
function leaderByWeek(trend: SeasonTrendEntry[]): { user_id: string; display_name: string }[] {
  const weeks = [...new Set(trend.map((r) => r.week_number))].sort((a, b) => a - b);
  const out: { user_id: string; display_name: string }[] = [];
  for (const w of weeks) {
    const leader = trend
      .filter((r) => r.week_number === w && r.cumulative_rank_this_week === 1)
      .sort(
        (a, b) => a.display_name.localeCompare(b.display_name) || a.user_id.localeCompare(b.user_id)
      )[0];
    if (leader) out.push({ user_id: leader.user_id, display_name: leader.display_name });
  }
  return out;
}

/** Story of the #1 spot: lead changes, wire-to-wire, and who held it most weeks. */
export function selectLeadSummary(
  trend: SeasonTrendEntry[],
  optedOut: Set<string>
): WrappedLeadSummary {
  const seq = leaderByWeek(trend);
  if (seq.length === 0) return { changes: 0, wire_to_wire: false, most_weeks_leader: null };
  let changes = 0;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].user_id !== seq[i - 1].user_id) changes++;
  }
  const tally = new Map<string, { display_name: string; weeks: number }>();
  for (const s of seq) {
    const t = tally.get(s.user_id);
    if (t) t.weeks++;
    else tally.set(s.user_id, { display_name: s.display_name, weeks: 1 });
  }
  const [topId, top] = [...tally.entries()].sort(
    (a, b) =>
      b[1].weeks - a[1].weeks ||
      a[1].display_name.localeCompare(b[1].display_name) ||
      a[0].localeCompare(b[0])
  )[0];
  return {
    changes,
    wire_to_wire: tally.size === 1 && seq.length >= 2,
    most_weeks_leader: {
      display_name: neutralizeName(top.display_name, topId, optedOut),
      weeks: top.weeks
    }
  };
}

/** The season's longest win streak (max_streak ≥ floor), opt-out neutralized. */
export function selectLongestHeater(
  streaks: StreakStatsEntry[],
  optedOut: Set<string>
): WrappedHeater | null {
  const top = [...streaks]
    .filter((s) => s.max_streak >= MIN_SEASON_HEATER)
    .sort(
      (a, b) =>
        b.max_streak - a.max_streak ||
        a.display_name.localeCompare(b.display_name) ||
        a.user_id.localeCompare(b.user_id)
    )[0];
  return top
    ? {
        display_name: neutralizeName(top.display_name, top.user_id, optedOut),
        streak: top.max_streak
      }
    : null;
}

export async function buildSeasonWrappedFacts(params: {
  groupId: string;
  seasonYear: number;
}): Promise<SeasonWrappedFacts> {
  const { groupId, seasonYear } = params;

  const [groupMeta, seasonTotals, seasonStats] = await Promise.all([
    loadGroupMeta(groupId),
    getSeasonLeaderboard(seasonYear, groupId),
    getStatsForSeason(seasonYear, groupId)
  ]);

  const optedOut = new Set(groupMeta.optedOutUserIds);

  // Season title/milestone badges (season-complete = true crowns provisional badges).
  const badges = computeBadges(badgeInputsFromSeasonStats(seasonStats, seasonTotals), true);

  // ── Per-player packets ─────────────────────────────────────────────────────────
  // Active players are this season's leaderboard participants (decisions > 0).
  const activeEntries = seasonTotals.filter((t) => t.decisions > 0);

  const players: PlayerWrappedFacts[] = activeEntries.map((entry) => {
    const userId = entry.user_id;

    // Best / worst scoring week from the season trend (tie-break: earliest week).
    const userTrend = seasonStats.trend.filter((r) => r.user_id === userId);
    let bestWeek: WrappedWeekExtreme | null = null;
    let worstWeek: WrappedWeekExtreme | null = null;
    for (const r of userTrend) {
      if (
        bestWeek === null ||
        r.week_points > bestWeek.points ||
        (r.week_points === bestWeek.points && r.week_number < bestWeek.week_number)
      ) {
        bestWeek = { week_number: r.week_number, points: r.week_points };
      }
      if (
        worstWeek === null ||
        r.week_points < worstWeek.points ||
        (r.week_points === worstWeek.points && r.week_number < worstWeek.week_number)
      ) {
        worstWeek = { week_number: r.week_number, points: r.week_points };
      }
    }

    // All-In (weight 'A') record for the season.
    const allinRow = seasonStats.weightAccuracy.find(
      (w) => w.user_id === userId && w.weight === 'A'
    );
    const allin =
      allinRow && allinRow.decisions > 0
        ? { wins: allinRow.wins, losses: allinRow.losses, pushes: allinRow.pushes }
        : null;

    // Contrarian record from the consensus aggregates.
    const consensus = seasonStats.consensusStats.find((c) => c.user_id === userId);

    // Nemesis: the qualifying opponent who beat the subject by the widest margin.
    let nemesis: WrappedNemesis | null = null;
    let bestMargin = 0; // require a losing record (losses - wins > 0)
    for (const h of seasonStats.headToHead) {
      if (h.user_id !== userId) continue;
      if (h.games_compared < NEMESIS_MIN_GAMES) continue;
      const margin = h.losses - h.wins;
      const better =
        margin > bestMargin ||
        (margin === bestMargin &&
          nemesis !== null &&
          (h.games_compared > nemesis.games ||
            (h.games_compared === nemesis.games &&
              h.opponent_user_id.localeCompare(nemesis.opponent.user_id) < 0)));
      if (margin > 0 && (nemesis === null || better)) {
        nemesis = {
          opponent: {
            user_id: h.opponent_user_id,
            display_name: neutralizeName(h.opponent_display_name, h.opponent_user_id, optedOut)
          },
          wins: h.wins,
          losses: h.losses,
          pushes: h.pushes,
          games: h.games_compared
        };
        bestMargin = margin;
      }
    }

    // Archetype badges this player earned (preserve computeBadges' deterministic order).
    const playerBadges: WrappedBadge[] = badges
      .filter((b) => b.holders.some((holder) => holder.user_id === userId))
      .map((b) => ({ id: b.id, label: b.label, emoji: b.emoji, kind: b.kind }));

    // Season-long personal bests for the 2nd-person blurb.
    const bestRank =
      userTrend.length > 0 ? Math.min(...userTrend.map((r) => r.cumulative_rank_this_week)) : null;
    const streakRow = seasonStats.streaks.find((s) => s.user_id === userId);

    return {
      user_id: userId,
      display_name: entry.display_name,
      rank: entry.rank,
      total_points: entry.total_points,
      decisions: entry.decisions,
      record: { wins: entry.wins, losses: entry.losses, pushes: entry.pushes },
      best_week: bestWeek,
      worst_week: worstWeek,
      allin,
      contrarian_wins: consensus?.contrarian_wins ?? 0,
      contrarian_picks: consensus?.contrarian_picks ?? 0,
      nemesis,
      badges: playerBadges,
      best_rank: bestRank,
      longest_streak: streakRow?.max_streak ?? 0,
      opted_out: optedOut.has(userId)
    };
  });

  // ── League packet ──────────────────────────────────────────────────────────────
  // Champion / wooden spoon come from THIS season's standings (rank 1 / max rank), not
  // getLeagueHonors — that read-model only exposes the newest completed season, which is
  // wrong for backfilled older seasons. seasonTotals is ordered by rank ascending.
  const championEntry = seasonTotals[0] ?? null;
  const spoonEntry = seasonTotals.length > 1 ? seasonTotals[seasonTotals.length - 1] : null;

  const titleBadges = badges
    .filter((b) => b.kind === 'title' && b.holders.length > 0)
    .map((b) => ({
      label: b.label,
      emoji: b.emoji,
      holders: b.holders.map((h) => neutralizeName(h.display_name, h.user_id, optedOut))
    }));

  // Season storyline beats (drama over the whole arc, not just the final table).
  const { biggest_climber, biggest_faller } = selectRankJourneys(seasonStats.trend, optedOut);
  const lead = selectLeadSummary(seasonStats.trend, optedOut);
  const longestHeater = selectLongestHeater(seasonStats.streaks, optedOut);
  // Margin of victory: champion − runner-up points (seasonTotals is rank-ordered).
  const titleMargin =
    seasonTotals.length >= 2 ? seasonTotals[0].total_points - seasonTotals[1].total_points : null;

  const league: LeagueWrappedFacts = {
    champion: championEntry
      ? {
          display_name: neutralizeName(championEntry.display_name, championEntry.user_id, optedOut),
          total_points: championEntry.total_points
        }
      : null,
    wooden_spoon: spoonEntry
      ? {
          display_name: neutralizeName(spoonEntry.display_name, spoonEntry.user_id, optedOut),
          total_points: spoonEntry.total_points
        }
      : null,
    standings: seasonTotals.map((t) => ({
      user_id: t.user_id,
      display_name: neutralizeName(t.display_name, t.user_id, optedOut),
      rank: t.rank,
      total_points: t.total_points
    })),
    title_badges: titleBadges,
    player_count: activeEntries.length,
    biggest_climber,
    biggest_faller,
    lead,
    longest_heater: longestHeater,
    title_margin: titleMargin
  };

  return {
    group_id: groupId,
    group_name: groupMeta.name,
    season_year: seasonYear,
    spice: groupMeta.spice,
    opted_out_user_ids: groupMeta.optedOutUserIds,
    league,
    players
  };
}

/** Flatten the builder output into the per-subject voice/persist units (league first). */
export function toSeasonWrappedSubjects(facts: SeasonWrappedFacts): SeasonWrappedSubject[] {
  const base = {
    group_name: facts.group_name,
    season_year: facts.season_year,
    spice: facts.spice
  };
  const leagueSubject: SeasonWrappedSubject = {
    ...base,
    scope: 'league',
    subject_user_id: null,
    facts: facts.league
  };
  const playerSubjects: SeasonWrappedSubject[] = facts.players.map((p) => ({
    ...base,
    scope: 'player',
    subject_user_id: p.user_id,
    facts: p
  }));
  return [leagueSubject, ...playerSubjects];
}

// ── Deterministic fallback copy (used when the AI call fails or is over budget) ──────
function recordStr(r: { wins: number; losses: number; pushes: number }): string {
  return `${r.wins}-${r.losses}-${r.pushes}`;
}

export function renderSeasonFallback(subject: SeasonWrappedSubject): string {
  if (subject.scope === 'league') {
    const f = subject.facts;
    const lines: string[] = [
      `${subject.group_name}'s ${subject.season_year} season is in the books.`
    ];
    if (f.champion) {
      lines.push(
        `${f.champion.display_name} took the crown with ${f.champion.total_points} points.`
      );
    }
    if (f.wooden_spoon) {
      lines.push(`${f.wooden_spoon.display_name} brought up the rear.`);
    }
    lines.push(
      `${f.player_count} ${f.player_count === 1 ? 'player' : 'players'} competed this season.`
    );
    return lines.join(' ');
  }

  const f = subject.facts;
  const lines: string[] = [
    `Your ${subject.season_year} season with ${subject.group_name}: you finished #${f.rank} with ${f.total_points} points (${recordStr(f.record)}).`
  ];
  if (f.best_week) {
    lines.push(
      `Your best week was Week ${f.best_week.week_number} (${f.best_week.points} points).`
    );
  }
  if (f.allin) {
    lines.push(`All-In record: ${recordStr(f.allin)}.`);
  }
  if (f.nemesis) {
    lines.push(
      `Your nemesis was ${f.nemesis.opponent.display_name} (${f.nemesis.wins}-${f.nemesis.losses}-${f.nemesis.pushes} against them).`
    );
  }
  if (f.badges.length > 0) {
    lines.push(`Badges earned: ${f.badges.map((b) => b.label).join(', ')}.`);
  }
  return lines.join(' ');
}
