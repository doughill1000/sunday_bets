import type { BadgeAward, BadgeHolder, BadgeId } from '$lib/types/honors';

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

export type BadgeInputs = {
  seasonTotals: BadgeSeasonTotalsEntry[];
  weightAccuracy: BadgeWeightEntry[];
  headToHead: BadgeH2HEntry[];
  teamAccuracy: BadgeTeamEntry[];
  trend: BadgeTrendEntry[];
};

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

const FLAVORS: Record<BadgeId, { label: string; emoji: string; flavor: string }> = {
  'the-degenerate': {
    label: 'The Degenerate',
    emoji: '🎰',
    flavor: "Can't miss a game. Every slate, every week."
  },
  'mr-calculated': {
    label: 'Mr. Calculated',
    emoji: '🧮',
    flavor: 'Ice in the veins, spreadsheets in the soul.'
  },
  'the-choker': {
    label: 'The Choker',
    emoji: '😬',
    flavor: 'Went all in… and all in went wrong.'
  },
  'the-ghost': {
    label: 'The Ghost',
    emoji: '👻',
    flavor: 'Showed up for the group chat. Not the picks.'
  },
  'the-nemesis': {
    label: 'The Nemesis',
    emoji: '⚔️',
    flavor: 'Nobody wants to be on the other side of this matchup.'
  },
  'the-homer': {
    label: 'The Homer',
    emoji: '🏠',
    flavor: 'Picks on vibes and team colors.'
  },
  'big-game-hunter': {
    label: 'Big Game Hunter',
    emoji: '🎯',
    flavor: 'Went all in — and cashed.'
  },
  'perfect-week': {
    label: 'Perfect Week',
    emoji: '✨',
    flavor: 'Not a single wrong pick all week.'
  }
};

function award(id: BadgeId, kind: 'title', holders: [BadgeHolder]): BadgeAward;
function award(id: BadgeId, kind: 'milestone', holders: BadgeHolder[]): BadgeAward;
function award(id: BadgeId, kind: BadgeAward['kind'], holders: BadgeHolder[]): BadgeAward {
  const { label, emoji, flavor } = FLAVORS[id];
  return { id, label, emoji, flavor, kind, holders };
}

/**
 * Pure badge engine: derives all per-season identity titles and milestone badges
 * from pre-fetched settled stats. Returns only awarded badges (unqualified badges
 * are omitted). Deterministic: stable tie-breaks and no side effects.
 */
export function computeBadges(inputs: BadgeInputs): BadgeAward[] {
  const { seasonTotals, weightAccuracy, headToHead, teamAccuracy, trend } = inputs;
  const guard = computeSampleGuard(seasonTotals);
  const badges: BadgeAward[] = [];

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

  const hunters = bigGameHunter(weightAccuracy);
  if (hunters.length > 0) badges.push(award('big-game-hunter', 'milestone', hunters));

  const perfecters = perfectWeek(trend);
  if (perfecters.length > 0) badges.push(award('perfect-week', 'milestone', perfecters));

  return badges;
}
