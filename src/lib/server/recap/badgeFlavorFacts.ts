// BadgeFlavor facts builder (#416, epic #283 Wave 3): pure, deterministic assembly of one
// packet per AWARDED badge for a completed season. The badge edition of seasonFacts.ts —
// reuses the same season read-models and the deterministic badge engine, never writes.
// ADR-0008 (boundary 2); the award stays deterministic, only the voice is generated.
//
// Opt-out rule (issue #416 AC): a badge holder who opted out of AI roasting is neutralized to
// 'a player' and flagged, so the voice never names or roasts them.
import { computeBadges, badgeInputsFromSeasonStats } from '$lib/domain/badges';
import type { BadgeInputs } from '$lib/domain/badges';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { loadGroupMeta } from '$lib/server/recap/facts';
import type { BadgeAward, BadgeId } from '$lib/types/honors';
import type { SpiceLevel } from '$lib/types/server/recap';
import type {
  BadgeEarningStat,
  BadgeFlavorFacts,
  BadgeFlavorHolder,
  BadgeFlavorSubject
} from '$lib/types/server/badgeFlavor';

/** Integer win/share percentage, guarded against divide-by-zero. */
function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

/**
 * The badge-specific earning numbers for one holder, pulled from the SAME BadgeInputs the
 * award was computed from. Pure and additive — never re-runs or changes award logic; it just
 * re-reads the stat that justified the crown so the voice can cite the real figure. Numeric
 * primitives only (no PII). Unknown/absent rows yield an empty stat (the criteria still carry
 * the meaning). Mirrors the reducers in computeBadges without duplicating the ranking.
 */
export function earningStatFor(
  badgeId: BadgeId,
  userId: string,
  inputs: BadgeInputs
): BadgeEarningStat {
  const totals = inputs.seasonTotals.find((t) => t.user_id === userId);
  const allin = inputs.weightAccuracy.find((w) => w.user_id === userId && w.weight === 'A');
  const cons = inputs.consensus.find((c) => c.user_id === userId);
  const ls = inputs.lineSide.find((l) => l.user_id === userId);
  const streak = inputs.streaks.find((s) => s.user_id === userId);
  const trend = inputs.trend.filter((r) => r.user_id === userId);

  switch (badgeId) {
    case 'the-grinder':
      return totals ? { picks_placed: totals.decisions - totals.missed } : {};
    case 'the-sharp':
      return totals
        ? {
            wins: totals.wins,
            losses: totals.losses,
            win_pct: pct(totals.wins, totals.wins + totals.losses)
          }
        : {};
    case 'the-choker':
      return allin
        ? {
            allin_wins: allin.wins,
            allin_losses: allin.losses,
            loss_pct: pct(allin.losses, allin.wins + allin.losses)
          }
        : {};
    case 'the-whale':
      return allin
        ? {
            allin_wins: allin.wins,
            allin_losses: allin.losses,
            win_pct: pct(allin.wins, allin.wins + allin.losses)
          }
        : {};
    case 'the-ghost':
      return totals ? { missed_picks: totals.missed } : {};
    case 'the-nemesis': {
      // stats_head_to_head is an upper-triangle half-matrix; credit both sides for this user.
      let wins = 0;
      let losses = 0;
      for (const h of inputs.headToHead) {
        if (h.user_id === userId) {
          wins += h.wins;
          losses += h.losses;
        } else if (h.opponent_user_id === userId) {
          wins += h.losses;
          losses += h.wins;
        }
      }
      return { h2h_wins: wins, h2h_losses: losses };
    }
    case 'the-homer': {
      const playerTeams = inputs.teamAccuracy.filter((t) => t.user_id === userId);
      if (!totals || playerTeams.length === 0) return {};
      const top = playerTeams.reduce((max, curr) => (curr.decisions > max.decisions ? curr : max));
      return {
        top_team_picks: top.decisions,
        top_team_share_pct: pct(top.decisions, totals.decisions)
      };
    }
    case 'big-game-hunter':
      return allin ? { allin_wins: allin.wins } : {};
    case 'perfect-week': {
      const weeks = trend.filter(
        (r) => r.week_wins > 0 && r.week_losses === 0 && r.week_missed === 0
      ).length;
      return { perfect_weeks: weeks };
    }
    case 'lone-wolf':
    case 'sheep':
      return cons ? { avg_consensus_pct: Math.round(cons.mean_consensus_pct) } : {};
    case 'oracle':
    case 'the-fool':
      return cons
        ? {
            contrarian_wins: cons.contrarian_wins,
            contrarian_picks: cons.contrarian_picks,
            win_pct: pct(cons.contrarian_wins, cons.contrarian_picks)
          }
        : {};
    case 'the-lemming':
      return cons
        ? {
            majority_wins: cons.majority_wins,
            majority_picks: cons.majority_picks,
            win_pct: pct(cons.majority_wins, cons.majority_picks)
          }
        : {};
    case 'chalk-eater':
      return ls ? { favorite_share_pct: pct(ls.chalk_picks, ls.decisions) } : {};
    case 'dog-lover':
      return ls ? { underdog_share_pct: pct(ls.dog_picks, ls.decisions) } : {};
    case 'hot-hand':
      return streak ? { longest_win_streak: streak.max_streak } : {};
    case 'the-comeback': {
      if (trend.length === 0) return {};
      const sorted = [...trend].sort((a, b) => a.week_number - b.week_number);
      const finalRank = sorted[sorted.length - 1].cumulative_rank_this_week;
      const lowPointRank = Math.max(...trend.map((r) => r.cumulative_rank_this_week));
      return {
        spots_climbed: lowPointRank - finalRank,
        from_rank: lowPointRank,
        to_rank: finalRank
      };
    }
    case 'week-winner': {
      // Weeks this user led weekly scoring (highest week_points, alphaFirst tie-break per week).
      const weeks = [...new Set(inputs.trend.map((r) => r.week_number))];
      let weeksLed = 0;
      for (const w of weeks) {
        const rows = inputs.trend.filter((r) => r.week_number === w);
        if (rows.length === 0) continue;
        const maxPoints = Math.max(...rows.map((r) => r.week_points));
        const top = rows
          .filter((r) => r.week_points === maxPoints)
          .sort((a, b) => a.display_name.localeCompare(b.display_name))[0];
        if (top && top.user_id === userId) weeksLed++;
      }
      return { weeks_led: weeksLed };
    }
    case 'best-of-the-rest': {
      // Weeks this user posted the week's top score while in the bottom half of the standings.
      const weeks = [...new Set(inputs.trend.map((r) => r.week_number))];
      let standoutWeeks = 0;
      for (const w of weeks) {
        const rows = inputs.trend.filter((r) => r.week_number === w);
        if (rows.length === 0) continue;
        const maxPoints = Math.max(...rows.map((r) => r.week_points));
        const mine = rows.find((r) => r.user_id === userId);
        if (
          mine &&
          mine.week_points === maxPoints &&
          mine.cumulative_rank_this_week > rows.length / 2
        ) {
          standoutWeeks++;
        }
      }
      return { standout_weeks: standoutWeeks };
    }
    case 'cardiac':
      // The drama is the late takeover of #1, not a single number — criteria carry it.
      return { final_rank: 1 };
    default:
      return {};
  }
}

/**
 * Assemble one voice/persist subject from a computed badge award and the inputs it came from.
 * Pure: neutralizes opted-out holders to 'a player' and attaches each holder's earning stat.
 */
export function toBadgeFlavorSubject(
  award: BadgeAward,
  inputs: BadgeInputs,
  ctx: { optedOut: Set<string>; groupName: string; seasonYear: number; spice: SpiceLevel }
): BadgeFlavorSubject {
  const holders: BadgeFlavorHolder[] = award.holders.map((h) => ({
    display_name: ctx.optedOut.has(h.user_id) ? 'a player' : h.display_name,
    opted_out: ctx.optedOut.has(h.user_id),
    stat: earningStatFor(award.id, h.user_id, inputs)
  }));
  return {
    badge_id: award.id,
    label: award.label,
    emoji: award.emoji,
    kind: award.kind,
    description: award.description,
    static_flavor: award.flavor,
    holders,
    any_opted_out: holders.some((h) => h.opted_out),
    group_name: ctx.groupName,
    season_year: ctx.seasonYear,
    spice: ctx.spice
  };
}

/**
 * Build one subject per awarded badge for a group's completed season. DB-bound: reads the same
 * season read-models seasonFacts.ts does, then runs the crowned (season-complete) badge engine.
 */
export async function buildBadgeFlavorSubjects(params: {
  groupId: string;
  seasonYear: number;
}): Promise<BadgeFlavorSubject[]> {
  const { groupId, seasonYear } = params;

  const [groupMeta, seasonTotals, seasonStats] = await Promise.all([
    loadGroupMeta(groupId),
    getSeasonLeaderboard(seasonYear, groupId),
    getStatsForSeason(seasonYear, groupId)
  ]);

  const optedOut = new Set(groupMeta.optedOutUserIds);
  const inputs = badgeInputsFromSeasonStats(seasonStats, seasonTotals);
  // seasonComplete = true crowns provisional badges (e.g. Hot Hand on max_streak).
  const badges = computeBadges(inputs, true);

  const ctx = { optedOut, groupName: groupMeta.name, seasonYear, spice: groupMeta.spice };
  return badges.map((award) => toBadgeFlavorSubject(award, inputs, ctx));
}

/** The persisted facts packet for one subject (the deterministic input behind the flavor). */
export function factsFromSubject(subject: BadgeFlavorSubject): BadgeFlavorFacts {
  return {
    label: subject.label,
    kind: subject.kind,
    description: subject.description,
    holders: subject.holders
  };
}

/**
 * Deterministic fallback copy: the exact current static tagline for this badge. Used when the
 * AI call fails or the season budget is spent, so the chip never breaks (issue #416 AC).
 */
export function renderBadgeFallback(subject: BadgeFlavorSubject): string {
  return subject.static_flavor;
}
