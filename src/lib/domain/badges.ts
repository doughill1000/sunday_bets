import type {
  BadgeAward,
  BadgeGlossaryEntry,
  BadgeHolder,
  BadgeId,
  BadgeKind
} from '$lib/types/honors';
import type {
  ConsensusStatsEntry,
  LineSideStatsEntry,
  StreakStatsEntry,
  SeasonStats
} from '$lib/types/server/stats';
import type { SeasonLeaderboardEntry } from '$lib/types/leaderboard';

// Input types shaped from matview rows; all required fields already non-null.

export type BadgeSeasonTotalsEntry = {
  user_id: string;
  display_name: string;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  missed: number;
};

export type BadgeWeightEntry = {
  user_id: string;
  display_name: string;
  weight: string;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
};

export type BadgeH2HEntry = {
  user_id: string;
  display_name: string;
  opponent_user_id: string;
  opponent_display_name: string;
  games_compared: number;
  wins: number;
  losses: number;
};

export type BadgeTeamEntry = {
  user_id: string;
  display_name: string;
  team_id: number;
  decisions: number;
  wins: number;
  losses: number;
};

export type BadgeTrendEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  week_wins: number;
  week_losses: number;
  week_missed: number;
};

// Tier-B consensus input (per-user aggregate from group_pick_consensus matview, #294).
export type BadgeConsensusEntry = {
  user_id: string;
  display_name: string;
  /** Total non-missed picks in scoring rounds. */
  decisions: number;
  /** Average consensus_pct across picks (0–100). */
  mean_consensus_pct: number;
  /** Picks where the user was in the minority (consensus_pct < 50). */
  contrarian_picks: number;
  /** Minority picks that graded as wins. */
  contrarian_wins: number;
  /** Picks where the user was with the majority (!is_minority). */
  majority_picks: number;
  /** Majority picks that graded as wins. */
  majority_wins: number;
};

// Line-side input (per-user aggregate from stats_accuracy_by_line_side matview, #317).
export type BadgeLineSideEntry = {
  user_id: string;
  display_name: string;
  /** Total non-missed picks in scoring rounds (denominator for both ratios). */
  decisions: number;
  /** Picks on the spread favorite (line at pick time). */
  chalk_picks: number;
  /** Picks on the spread underdog (line at pick time). */
  dog_picks: number;
};

// Tier-C streak input (from stats_pick_streaks matview, #296).
export type BadgeStreakEntry = {
  user_id: string;
  display_name: string;
  /** Non-push graded picks (wins + losses + missed) — used by the sample guard. */
  graded_picks: number;
  /** Consecutive wins ending at the most recent graded pick (provisional rank). */
  current_streak: number;
  /** Longest consecutive win run achieved in the season (crowned rank). */
  max_streak: number;
};

export type BadgeInputs = {
  seasonTotals: BadgeSeasonTotalsEntry[];
  weightAccuracy: BadgeWeightEntry[];
  headToHead: BadgeH2HEntry[];
  teamAccuracy: BadgeTeamEntry[];
  trend: BadgeTrendEntry[];
  /** Per-user consensus aggregates for Tier-B badges (#294). */
  consensus: BadgeConsensusEntry[];
  /** Per-user favorite-vs-underdog pick mix for line-side badges (#317). */
  lineSide: BadgeLineSideEntry[];
  /** Per-user streak data for Tier-C Hot Hand badge (#296). */
  streaks: BadgeStreakEntry[];
};

/**
 * Projects the season stats a `/stats` load already fetches into `BadgeInputs`, so the
 * badge engine reuses those rows instead of re-querying the same five matviews
 * (`leaderboard_season_totals`, `stats_accuracy_by_weight`, `stats_head_to_head`,
 * `stats_accuracy_by_team`, `stats_season_trend`). Pure: only narrows already-non-null
 * fields, no DB access. See `getStatsForSeason` / `getSeasonLeaderboard`.
 */
export function badgeInputsFromSeasonStats(
  season: SeasonStats,
  seasonTotals: SeasonLeaderboardEntry[]
): BadgeInputs {
  return {
    seasonTotals: seasonTotals.map((t) => ({
      user_id: t.user_id,
      display_name: t.display_name,
      decisions: t.decisions,
      wins: t.wins,
      losses: t.losses,
      pushes: t.pushes,
      missed: t.missed
    })),
    weightAccuracy: season.weightAccuracy.map((w) => ({
      user_id: w.user_id,
      display_name: w.display_name,
      weight: w.weight,
      decisions: w.decisions,
      wins: w.wins,
      losses: w.losses,
      pushes: w.pushes
    })),
    headToHead: season.headToHead.map((h) => ({
      user_id: h.user_id,
      display_name: h.display_name,
      opponent_user_id: h.opponent_user_id,
      opponent_display_name: h.opponent_display_name,
      games_compared: h.games_compared,
      wins: h.wins,
      losses: h.losses
    })),
    teamAccuracy: season.teamAccuracy.map((t) => ({
      user_id: t.user_id,
      display_name: t.display_name,
      team_id: t.team_id,
      decisions: t.decisions,
      wins: t.wins,
      losses: t.losses
    })),
    trend: season.trend.map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      week_number: r.week_number,
      week_wins: r.week_wins,
      week_losses: r.week_losses,
      week_missed: r.week_missed
    })),
    consensus: season.consensusStats.map(
      (c: ConsensusStatsEntry): BadgeConsensusEntry => ({
        user_id: c.user_id,
        display_name: c.display_name,
        decisions: c.decisions,
        mean_consensus_pct: c.mean_consensus_pct,
        contrarian_picks: c.contrarian_picks,
        contrarian_wins: c.contrarian_wins,
        majority_picks: c.majority_picks,
        majority_wins: c.majority_wins
      })
    ),
    lineSide: season.lineSide.map(
      (l: LineSideStatsEntry): BadgeLineSideEntry => ({
        user_id: l.user_id,
        display_name: l.display_name,
        decisions: l.decisions,
        chalk_picks: l.chalk_picks,
        dog_picks: l.dog_picks
      })
    ),
    streaks: season.streaks.map(
      (s: StreakStatsEntry): BadgeStreakEntry => ({
        user_id: s.user_id,
        display_name: s.display_name,
        graded_picks: s.graded_picks,
        current_streak: s.current_streak,
        max_streak: s.max_streak
      })
    )
  };
}

// Thresholds
const MIN_SAMPLE_DECISIONS = 5;
const SAMPLE_FRACTION = 0.35;
const BIG_GAME_WIN_THRESHOLD = 3;

/**
 * Season-scaled minimum decisions for accuracy-based title eligibility.
 * Scales with average league activity; floor is MIN_SAMPLE_DECISIONS.
 */
export function computeSampleGuard(totals: BadgeSeasonTotalsEntry[]): number {
  if (totals.length === 0) return MIN_SAMPLE_DECISIONS;
  const avg = totals.reduce((s, t) => s + t.decisions, 0) / totals.length;
  return Math.max(MIN_SAMPLE_DECISIONS, Math.round(avg * SAMPLE_FRACTION));
}

/**
 * Season-scaled minimum contrarian picks for Oracle eligibility.
 * Scales with average contrarian-pick count across the league.
 */
export function computeOracleGuard(consensus: BadgeConsensusEntry[]): number {
  if (consensus.length === 0) return MIN_SAMPLE_DECISIONS;
  const avg = consensus.reduce((s, c) => s + c.contrarian_picks, 0) / consensus.length;
  return Math.max(MIN_SAMPLE_DECISIONS, Math.round(avg * SAMPLE_FRACTION));
}

/**
 * Season-scaled minimum graded non-push picks for Hot Hand eligibility.
 * Prevents a week-1 streak from crowning immediately. Scales with average
 * league activity (graded_picks); floor is MIN_SAMPLE_DECISIONS.
 */
export function computeHotHandGuard(streaks: BadgeStreakEntry[]): number {
  if (streaks.length === 0) return MIN_SAMPLE_DECISIONS;
  const avg = streaks.reduce((s, t) => s + t.graded_picks, 0) / streaks.length;
  return Math.max(MIN_SAMPLE_DECISIONS, Math.round(avg * SAMPLE_FRACTION));
}

function alphaFirst<T extends { display_name: string }>(a: T, b: T): T {
  return a.display_name <= b.display_name ? a : b;
}

function holder(entry: { user_id: string; display_name: string }): BadgeHolder {
  return { user_id: entry.user_id, display_name: entry.display_name };
}

// --- Title badge helpers (superlative: one holder or null) ---

/**
 * Picks actually placed this season. The matview's `decisions` counts every
 * settlement row — including `missed` slates a player never picked — so the raw
 * column equals the full schedule, not participation. Subtracting `missed`
 * yields the graded picks (wins + losses + pushes) the player truly placed.
 */
function placedPicks(t: BadgeSeasonTotalsEntry): number {
  return t.decisions - t.missed;
}

function theGrinder(totals: BadgeSeasonTotalsEntry[]): BadgeHolder | null {
  // Rank by picks *placed*, not the raw slate count: once a season has missed
  // picks, every player shares the same `decisions` (the full schedule), which
  // collapses the title into an alphabetical tie-break and can hand it to the
  // player who actually missed the most — the opposite of a grinder.
  const eligible = totals.filter((t) => placedPicks(t) > 0);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      const currPlaced = placedPicks(curr);
      const bestPlaced = placedPicks(best);
      if (currPlaced > bestPlaced) return curr;
      if (currPlaced === bestPlaced) return alphaFirst(curr, best);
      return best;
    })
  );
}

function theSharp(totals: BadgeSeasonTotalsEntry[], guard: number): BadgeHolder | null {
  const eligible = totals.filter((t) => t.decisions >= guard && t.wins + t.losses > 0);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      const currAcc = curr.wins / (curr.wins + curr.losses);
      const bestAcc = best.wins / (best.wins + best.losses);
      if (currAcc > bestAcc) return curr;
      if (currAcc === bestAcc) {
        if (curr.decisions > best.decisions) return curr;
        if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

function theChoker(weights: BadgeWeightEntry[]): BadgeHolder | null {
  const allins = weights.filter((w) => w.weight === 'A' && w.wins + w.losses > 0);
  if (allins.length === 0) return null;
  return holder(
    allins.reduce((worst, curr) => {
      const currRate = curr.losses / (curr.wins + curr.losses);
      const worstRate = worst.losses / (worst.wins + worst.losses);
      if (currRate > worstRate) return curr;
      if (currRate === worstRate) {
        if (curr.decisions > worst.decisions) return curr;
        if (curr.decisions === worst.decisions) return alphaFirst(curr, worst);
      }
      return worst;
    })
  );
}

function theGhost(totals: BadgeSeasonTotalsEntry[]): BadgeHolder | null {
  const eligible = totals.filter((t) => t.missed > 0);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((most, curr) => {
      if (curr.missed > most.missed) return curr;
      if (curr.missed === most.missed) return alphaFirst(curr, most);
      return most;
    })
  );
}

function theNemesis(h2h: BadgeH2HEntry[]): BadgeHolder | null {
  if (h2h.length === 0) return null;
  const byUser = new Map<
    string,
    { user_id: string; display_name: string; wins: number; losses: number }
  >();
  // `stats_head_to_head` is an upper-triangle half-matrix: one row per pair, recorded
  // from the smaller-UUID player's perspective (`user_id < opponent_user_id`). Credit
  // BOTH players from each row — the listed user with (wins, losses) and the opponent
  // with the mirror (losses, wins). Aggregating by `user_id` alone collapses the award
  // to whoever owns the smallest UUID in the group, since theirs are the only matchups
  // ever counted. Mirrors `headToHeadForUser` in utils/stats.ts.
  const add = (id: string, name: string, wins: number, losses: number) => {
    const acc = byUser.get(id);
    if (acc) {
      acc.wins += wins;
      acc.losses += losses;
    } else {
      byUser.set(id, { user_id: id, display_name: name, wins, losses });
    }
  };
  for (const row of h2h) {
    add(row.user_id, row.display_name, row.wins, row.losses);
    add(row.opponent_user_id, row.opponent_display_name, row.losses, row.wins);
  }
  const players = [...byUser.values()];
  return holder(
    players.reduce((best, curr) => {
      if (curr.wins > best.wins) return curr;
      if (curr.wins === best.wins) {
        if (curr.losses < best.losses) return curr;
        if (curr.losses === best.losses) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

function theHomer(
  teams: BadgeTeamEntry[],
  totals: BadgeSeasonTotalsEntry[],
  guard: number
): BadgeHolder | null {
  const eligible = totals.filter((t) => t.decisions >= guard);
  if (eligible.length === 0) return null;

  type Candidate = { user_id: string; display_name: string; ratio: number; maxDecisions: number };
  const candidates: Candidate[] = eligible.flatMap((player) => {
    const playerTeams = teams.filter((t) => t.user_id === player.user_id);
    if (playerTeams.length === 0) return [];
    const top = playerTeams.reduce((max, curr) => (curr.decisions > max.decisions ? curr : max));
    return [
      {
        user_id: player.user_id,
        display_name: player.display_name,
        ratio: top.decisions / player.decisions,
        maxDecisions: top.decisions
      }
    ];
  });

  if (candidates.length === 0) return null;
  return holder(
    candidates.reduce((best, curr) => {
      if (curr.ratio > best.ratio) return curr;
      if (curr.ratio === best.ratio) {
        if (curr.maxDecisions > best.maxDecisions) return curr;
        if (curr.maxDecisions === best.maxDecisions) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

// --- Tier-B consensus badge helpers (#294, #316) ---

/**
 * Lone Wolf: most consistently picks against consensus (lowest mean consensus_pct).
 * Tendency badge — measures how often you deviate, not how well it turned out.
 * Requires `guard` decisions to be eligible (same season-scaled guard as Tier-A).
 */
function loneWolf(consensus: BadgeConsensusEntry[], guard: number): BadgeHolder | null {
  const eligible = consensus.filter((c) => c.decisions >= guard);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      if (curr.mean_consensus_pct < best.mean_consensus_pct) return curr;
      if (curr.mean_consensus_pct === best.mean_consensus_pct) {
        if (curr.decisions > best.decisions) return curr;
        if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

/**
 * Sheep: most consistently picks with the crowd (highest mean consensus_pct).
 * Tendency badge — requires `guard` decisions to be eligible.
 */
function sheep(consensus: BadgeConsensusEntry[], guard: number): BadgeHolder | null {
  const eligible = consensus.filter((c) => c.decisions >= guard);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      if (curr.mean_consensus_pct > best.mean_consensus_pct) return curr;
      if (curr.mean_consensus_pct === best.mean_consensus_pct) {
        if (curr.decisions > best.decisions) return curr;
        if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

/**
 * Oracle: best contrarian-pick win rate above a season-scaled minimum sample.
 * Verdict badge — only picks made against the majority (is_minority = true) count.
 * Does not award when no player reaches the oracle guard on contrarian picks.
 */
function oracle(consensus: BadgeConsensusEntry[], oracleGuard: number): BadgeHolder | null {
  const eligible = consensus.filter(
    (c) => c.contrarian_picks >= oracleGuard && c.contrarian_picks > 0
  );
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      const currRate = curr.contrarian_wins / curr.contrarian_picks;
      const bestRate = best.contrarian_wins / best.contrarian_picks;
      if (currRate > bestRate) return curr;
      if (currRate === bestRate) {
        if (curr.contrarian_picks > best.contrarian_picks) return curr;
        if (curr.contrarian_picks === best.contrarian_picks) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

/**
 * The Fool: worst contrarian-pick win rate above the oracle guard.
 * Verdict badge — mirror of oracle() with reduce flipped to find the minimum.
 * Does not award when no player reaches the oracle guard on contrarian picks.
 */
function theFool(consensus: BadgeConsensusEntry[], oracleGuard: number): BadgeHolder | null {
  const eligible = consensus.filter(
    (c) => c.contrarian_picks >= oracleGuard && c.contrarian_picks > 0
  );
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((worst, curr) => {
      const currRate = curr.contrarian_wins / curr.contrarian_picks;
      const worstRate = worst.contrarian_wins / worst.contrarian_picks;
      if (currRate < worstRate) return curr;
      if (currRate === worstRate) {
        if (curr.contrarian_picks > worst.contrarian_picks) return curr;
        if (curr.contrarian_picks === worst.contrarian_picks) return alphaFirst(curr, worst);
      }
      return worst;
    })
  );
}

/**
 * The Lemming: worst majority-pick win rate above a season-scaled minimum sample.
 * Verdict badge — flock-side mirror of theFool(); uses majority_picks / majority_wins.
 * Does not award when no player reaches the guard on majority picks.
 */
function theLemming(consensus: BadgeConsensusEntry[], oracleGuard: number): BadgeHolder | null {
  const eligible = consensus.filter((c) => c.majority_picks >= oracleGuard && c.majority_picks > 0);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((worst, curr) => {
      const currRate = curr.majority_wins / curr.majority_picks;
      const worstRate = worst.majority_wins / worst.majority_picks;
      if (currRate < worstRate) return curr;
      if (currRate === worstRate) {
        if (curr.majority_picks > worst.majority_picks) return curr;
        if (curr.majority_picks === worst.majority_picks) return alphaFirst(curr, worst);
      }
      return worst;
    })
  );
}

// --- Line-side badge helpers (#317) ---

/**
 * Chalk Eater: biggest share of picks on the spread favorite. Requires `guard`
 * decisions to be eligible (same season-scaled guard as Tier-A). Ratio is favorite
 * picks over all of the player's picks, so pick'em games dilute it like any non-favorite.
 */
function chalkEater(lineSide: BadgeLineSideEntry[], guard: number): BadgeHolder | null {
  const eligible = lineSide.filter((l) => l.decisions >= guard);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      const currRatio = curr.chalk_picks / curr.decisions;
      const bestRatio = best.chalk_picks / best.decisions;
      if (currRatio > bestRatio) return curr;
      if (currRatio === bestRatio) {
        if (curr.decisions > best.decisions) return curr;
        if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

/**
 * Dog Lover: biggest share of picks on the spread underdog. Mirror of {@link chalkEater}
 * on the same favorite-vs-dog axis; requires `guard` decisions to be eligible.
 */
function dogLover(lineSide: BadgeLineSideEntry[], guard: number): BadgeHolder | null {
  const eligible = lineSide.filter((l) => l.decisions >= guard);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      const currRatio = curr.dog_picks / curr.decisions;
      const bestRatio = best.dog_picks / best.decisions;
      if (currRatio > bestRatio) return curr;
      if (currRatio === bestRatio) {
        if (curr.decisions > best.decisions) return curr;
        if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      }
      return best;
    })
  );
}

// --- Tier-C live-form badge helpers (#296) ---

/**
 * Hot Hand: longest current correct-pick streak.
 * Provisional (in-season): ranks by `current_streak`.
 * Crowned (season complete): ranks by `max_streak` (longest run achieved).
 * Requires `guard` graded non-push picks to suppress early-season noise.
 * AlphaFirst tie-break, then more graded_picks for volume tie-break.
 */
function hotHand(
  streaks: BadgeStreakEntry[],
  guard: number,
  seasonComplete: boolean
): BadgeHolder | null {
  const eligible = streaks.filter((s) => s.graded_picks >= guard);
  if (eligible.length === 0) return null;
  const key = (s: BadgeStreakEntry) => (seasonComplete ? s.max_streak : s.current_streak);
  const best = eligible.reduce((best, curr) => {
    if (key(curr) > key(best)) return curr;
    if (key(curr) === key(best)) {
      if (curr.graded_picks > best.graded_picks) return curr;
      if (curr.graded_picks === best.graded_picks) return alphaFirst(curr, best);
    }
    return best;
  });
  if (key(best) === 0) return null;
  return holder(best);
}

// --- Milestone badge helpers (threshold: zero or more holders) ---

function bigGameHunter(weights: BadgeWeightEntry[]): BadgeHolder[] {
  return weights
    .filter((w) => w.weight === 'A' && w.wins >= BIG_GAME_WIN_THRESHOLD)
    .map((w) => ({ user_id: w.user_id, display_name: w.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

function perfectWeek(trend: BadgeTrendEntry[]): BadgeHolder[] {
  const seen = new Map<string, BadgeHolder>();
  for (const row of trend) {
    if (row.week_wins > 0 && row.week_losses === 0 && row.week_missed === 0) {
      seen.set(row.user_id, { user_id: row.user_id, display_name: row.display_name });
    }
  }
  return [...seen.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

// --- Hardcoded flavor slots (AI layer #189 overrides these later) ---

const FLAVORS: Record<
  BadgeId,
  { label: string; emoji: string; flavor: string; description: string }
> = {
  'the-grinder': {
    label: 'The Grinder',
    emoji: '🪨',
    flavor: "Can't miss a game. Every slate, every week.",
    description: 'Placed the most picks this season.'
  },
  'the-sharp': {
    label: 'The Sharp',
    emoji: '📈',
    flavor: 'Sharp money. Best closing record in the room.',
    description: 'Best win rate this season (minimum number of picks required).'
  },
  'the-choker': {
    label: 'The Choker',
    emoji: '😬',
    flavor: 'Went all in… and all in went wrong.',
    description: 'Worst win rate on All-In picks this season.'
  },
  'the-ghost': {
    label: 'The Ghost',
    emoji: '👻',
    flavor: 'Showed up for the group chat. Not the picks.',
    description: 'Missed the most picks this season.'
  },
  'the-nemesis': {
    label: 'The Nemesis',
    emoji: '⚔️',
    flavor: 'Nobody wants to be on the other side of this matchup.',
    description: 'Best head-to-head record this season on games where you picked the opposite side.'
  },
  'the-homer': {
    label: 'The Homer',
    emoji: '🏠',
    flavor: 'Picks on vibes and team colors.',
    description: 'Biggest share of picks on a single team (minimum number of picks required).'
  },
  'big-game-hunter': {
    label: 'Big Game Hunter',
    emoji: '🎯',
    flavor: 'Went all in — and cashed.',
    description: 'Won 3 or more All-In picks this season.'
  },
  'perfect-week': {
    label: 'Perfect Week',
    emoji: '✨',
    flavor: 'Not a single wrong pick all week.',
    description: 'Had at least one week with every pick correct and none missed.'
  },
  // Tier-B consensus badges (#294, #316)
  'lone-wolf': {
    label: 'Lone Wolf',
    emoji: '🐺',
    flavor: 'Runs with no one. Fades the whole flock.',
    description:
      "Fades the group's consensus more often than anyone this season (minimum picks required)."
  },
  sheep: {
    label: 'The Sheep',
    emoji: '🐑',
    flavor: 'Goes where the group goes. Safety in numbers.',
    description: "Most often picks with the group's consensus (minimum picks required)."
  },
  oracle: {
    label: 'The Oracle',
    emoji: '🔮',
    flavor: 'Bucks the crowd and wins. Madness or genius?',
    description:
      'Best win rate on picks made against the majority this season (minimum picks required).'
  },
  'the-fool': {
    label: 'The Fool',
    emoji: '🤡',
    flavor: 'Bucked the crowd. The crowd was right.',
    description:
      'Worst win rate on picks made against the majority this season (minimum picks required).'
  },
  'the-lemming': {
    label: 'The Lemming',
    emoji: '🐹',
    flavor: 'Followed the herd. Right off the cliff.',
    description:
      'Worst win rate on picks made with the majority this season (minimum picks required).'
  },
  // Line-side badges (#317)
  'chalk-eater': {
    label: 'Chalk Eater',
    emoji: '🧱',
    flavor: "Never met a favorite they didn't back.",
    description: 'Biggest share of picks on the spread favorite (minimum picks required).'
  },
  'dog-lover': {
    label: 'Dog Lover',
    emoji: '🐶',
    flavor: 'Loyalty over logic. Always takes the longshot.',
    description: 'Biggest share of picks on the spread underdog (minimum picks required).'
  },
  // Tier-C live-form badge (#296)
  'hot-hand': {
    label: 'Hot Hand',
    emoji: '🔥',
    flavor: "Can't miss right now. Every pick is money.",
    description:
      'Longest correct-pick streak this season (minimum picks required). Provisional in-season; crowned at season end on the longest run achieved.'
  }
};

/**
 * Ordered glossary of every possible award for the "Awards legend" modal — titles
 * (one holder per season) first, then milestones (anyone who clears the bar). Order
 * mirrors `computeBadges`. Derived from the same `FLAVORS` slots the engine awards from,
 * so copy stays single-sourced.
 */
const GLOSSARY_ORDER: { id: BadgeId; kind: BadgeKind }[] = [
  { id: 'the-grinder', kind: 'title' },
  { id: 'the-sharp', kind: 'title' },
  { id: 'the-choker', kind: 'title' },
  { id: 'the-ghost', kind: 'title' },
  { id: 'the-nemesis', kind: 'title' },
  { id: 'the-homer', kind: 'title' },
  { id: 'lone-wolf', kind: 'title' },
  { id: 'sheep', kind: 'title' },
  { id: 'oracle', kind: 'title' },
  { id: 'the-fool', kind: 'title' },
  { id: 'the-lemming', kind: 'title' },
  { id: 'chalk-eater', kind: 'title' },
  { id: 'dog-lover', kind: 'title' },
  { id: 'hot-hand', kind: 'title' },
  { id: 'big-game-hunter', kind: 'milestone' },
  { id: 'perfect-week', kind: 'milestone' }
];

export const BADGE_GLOSSARY: BadgeGlossaryEntry[] = GLOSSARY_ORDER.map(({ id, kind }) => ({
  id,
  kind,
  ...FLAVORS[id]
}));

function award(id: BadgeId, kind: 'title', holders: [BadgeHolder]): BadgeAward;
function award(id: BadgeId, kind: 'milestone', holders: BadgeHolder[]): BadgeAward;
function award(id: BadgeId, kind: BadgeAward['kind'], holders: BadgeHolder[]): BadgeAward {
  const { label, emoji, flavor, description } = FLAVORS[id];
  return { id, label, emoji, flavor, description, kind, holders };
}

/**
 * Pure badge engine: derives all per-season identity titles and milestone badges
 * from pre-fetched settled stats. Returns only awarded badges (unqualified badges
 * are omitted). Deterministic: stable tie-breaks and no side effects.
 *
 * @param seasonComplete - true when the season has completed; switches Hot Hand from
 *   provisional (current_streak) to crowned (max_streak) ranking.
 */
export function computeBadges(inputs: BadgeInputs, seasonComplete = false): BadgeAward[] {
  const {
    seasonTotals,
    weightAccuracy,
    headToHead,
    teamAccuracy,
    trend,
    consensus,
    lineSide,
    streaks
  } = inputs;
  const guard = computeSampleGuard(seasonTotals);
  const badges: BadgeAward[] = [];

  // Tier-A: superlative titles
  const degen = theGrinder(seasonTotals);
  if (degen) badges.push(award('the-grinder', 'title', [degen]));

  const calc = theSharp(seasonTotals, guard);
  if (calc) badges.push(award('the-sharp', 'title', [calc]));

  const choker = theChoker(weightAccuracy);
  if (choker) badges.push(award('the-choker', 'title', [choker]));

  const ghost = theGhost(seasonTotals);
  if (ghost) badges.push(award('the-ghost', 'title', [ghost]));

  const nemesis = theNemesis(headToHead);
  if (nemesis) badges.push(award('the-nemesis', 'title', [nemesis]));

  const homer = theHomer(teamAccuracy, seasonTotals, guard);
  if (homer) badges.push(award('the-homer', 'title', [homer]));

  // Tier-A: milestone badges
  const hunters = bigGameHunter(weightAccuracy);
  if (hunters.length > 0) badges.push(award('big-game-hunter', 'milestone', hunters));

  const perfecters = perfectWeek(trend);
  if (perfecters.length > 0) badges.push(award('perfect-week', 'milestone', perfecters));

  // Tier-B: consensus titles (#294, #316)
  if (consensus.length > 0) {
    const oracleGuard = computeOracleGuard(consensus);

    const wolf = loneWolf(consensus, guard);
    if (wolf) badges.push(award('lone-wolf', 'title', [wolf]));

    const sheepHolder = sheep(consensus, guard);
    if (sheepHolder) badges.push(award('sheep', 'title', [sheepHolder]));

    const oracleHolder = oracle(consensus, oracleGuard);
    if (oracleHolder) badges.push(award('oracle', 'title', [oracleHolder]));

    const foolHolder = theFool(consensus, oracleGuard);
    if (foolHolder) badges.push(award('the-fool', 'title', [foolHolder]));

    const lemmingHolder = theLemming(consensus, oracleGuard);
    if (lemmingHolder) badges.push(award('the-lemming', 'title', [lemmingHolder]));
  }

  // Line-side titles (#317)
  if (lineSide.length > 0) {
    const chalk = chalkEater(lineSide, guard);
    if (chalk) badges.push(award('chalk-eater', 'title', [chalk]));

    const dog = dogLover(lineSide, guard);
    if (dog) badges.push(award('dog-lover', 'title', [dog]));
  }

  // Tier-C: live-form streak title (#296)
  if (streaks.length > 0) {
    const hotHandGuard = computeHotHandGuard(streaks);
    const hand = hotHand(streaks, hotHandGuard, seasonComplete);
    if (hand) badges.push(award('hot-hand', 'title', [hand]));
  }

  return badges;
}
