import type {
  BadgeAward,
  BadgeGlossaryEntry,
  BadgeHolder,
  BadgeId,
  BadgeKind
} from '$lib/types/honors';
import type { ConsensusStatsEntry, SeasonStats } from '$lib/types/server/stats';
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
};

export type BadgeInputs = {
  seasonTotals: BadgeSeasonTotalsEntry[];
  weightAccuracy: BadgeWeightEntry[];
  headToHead: BadgeH2HEntry[];
  teamAccuracy: BadgeTeamEntry[];
  trend: BadgeTrendEntry[];
  /** Per-user consensus aggregates for Tier-B badges (#294). */
  consensus: BadgeConsensusEntry[];
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
        contrarian_wins: c.contrarian_wins
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

function alphaFirst<T extends { display_name: string }>(a: T, b: T): T {
  return a.display_name <= b.display_name ? a : b;
}

function holder(entry: { user_id: string; display_name: string }): BadgeHolder {
  return { user_id: entry.user_id, display_name: entry.display_name };
}

// --- Title badge helpers (superlative: one holder or null) ---

function theDegenerate(totals: BadgeSeasonTotalsEntry[]): BadgeHolder | null {
  const eligible = totals.filter((t) => t.decisions > 0);
  if (eligible.length === 0) return null;
  return holder(
    eligible.reduce((best, curr) => {
      if (curr.decisions > best.decisions) return curr;
      if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      return best;
    })
  );
}

function mrCalculated(totals: BadgeSeasonTotalsEntry[], guard: number): BadgeHolder | null {
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
  for (const row of h2h) {
    const acc = byUser.get(row.user_id);
    if (acc) {
      acc.wins += row.wins;
      acc.losses += row.losses;
    } else {
      byUser.set(row.user_id, {
        user_id: row.user_id,
        display_name: row.display_name,
        wins: row.wins,
        losses: row.losses
      });
    }
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

// --- Tier-B consensus badge helpers (#294) ---

/**
 * Contrarian: most consistently picks against consensus (lowest mean consensus_pct).
 * Requires `guard` decisions to be eligible (same season-scaled guard as Tier-A).
 */
function contrarian(consensus: BadgeConsensusEntry[], guard: number): BadgeHolder | null {
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
 * Requires `guard` decisions to be eligible.
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
 * Only picks made against the majority (is_minority = true) count toward the rate.
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
  'the-degenerate': {
    label: 'The Degenerate',
    emoji: '🎰',
    flavor: "Can't miss a game. Every slate, every week.",
    description: 'Placed the most picks this season.'
  },
  'mr-calculated': {
    label: 'Mr. Calculated',
    emoji: '🧮',
    flavor: 'Ice in the veins, spreadsheets in the soul.',
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
    description: 'Best overall head-to-head record against the league this season.'
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
  // Tier-B consensus badges (#294)
  contrarian: {
    label: 'The Contrarian',
    emoji: '🦅',
    flavor: 'Always bucks the crowd. Sometimes right, never boring.',
    description: "Most often picks against the group's consensus (minimum picks required)."
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
    description: 'Best win rate on picks made against the majority (minimum picks required).'
  }
};

/**
 * Ordered glossary of every possible award for the "Awards guide" modal — titles
 * (one holder per season) first, then milestones (anyone who clears the bar). Order
 * mirrors `computeBadges`. Derived from the same `FLAVORS` slots the engine awards from,
 * so copy stays single-sourced.
 */
const GLOSSARY_ORDER: { id: BadgeId; kind: BadgeKind }[] = [
  { id: 'the-degenerate', kind: 'title' },
  { id: 'mr-calculated', kind: 'title' },
  { id: 'the-choker', kind: 'title' },
  { id: 'the-ghost', kind: 'title' },
  { id: 'the-nemesis', kind: 'title' },
  { id: 'the-homer', kind: 'title' },
  { id: 'contrarian', kind: 'title' },
  { id: 'sheep', kind: 'title' },
  { id: 'oracle', kind: 'title' },
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
 */
export function computeBadges(inputs: BadgeInputs): BadgeAward[] {
  const { seasonTotals, weightAccuracy, headToHead, teamAccuracy, trend, consensus } = inputs;
  const guard = computeSampleGuard(seasonTotals);
  const badges: BadgeAward[] = [];

  // Tier-A: superlative titles
  const degen = theDegenerate(seasonTotals);
  if (degen) badges.push(award('the-degenerate', 'title', [degen]));

  const calc = mrCalculated(seasonTotals, guard);
  if (calc) badges.push(award('mr-calculated', 'title', [calc]));

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

  // Tier-B: consensus titles (#294)
  if (consensus.length > 0) {
    const oracleGuard = computeOracleGuard(consensus);

    const cont = contrarian(consensus, guard);
    if (cont) badges.push(award('contrarian', 'title', [cont]));

    const sheepHolder = sheep(consensus, guard);
    if (sheepHolder) badges.push(award('sheep', 'title', [sheepHolder]));

    const oracleHolder = oracle(consensus, oracleGuard);
    if (oracleHolder) badges.push(award('oracle', 'title', [oracleHolder]));
  }

  return badges;
}
