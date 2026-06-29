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
  WrappedBadge
} from '$lib/types/server/seasonWrapped';

// A nemesis needs enough shared games to be signal, not noise (cf. MIN_RIVALRY_GAMES).
const NEMESIS_MIN_GAMES = 4;

/** Replace an opted-out player's name with 'a player'; leave others untouched. */
function neutralizeName(displayName: string, userId: string, optedOut: Set<string>): string {
  return optedOut.has(userId) ? 'a player' : displayName;
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
    player_count: activeEntries.length
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
