// Weekly "hardware" (#387, reshaped to three all-positive awards in #866): cosmetic awards
// minted per fully-graded scoring week. Pure and deterministic like `badges.ts` — selectors
// take pre-fetched matview rows and return holders with stable tie-breaks, no side effects.
//
// Non-scoring rounds (ADR-0016) never reach here: every source matview filters `w.is_scoring`,
// so those weeks contribute no rows and are absent from the week set.

// pick_settlement.outcome / group_pick_consensus.graded_outcome, stated inline to keep this
// module free of the generated DB types (matches badges.ts).
type PickOutcome = 'win' | 'loss' | 'push' | 'missed';

/** picks.weight. 'A' is the All-In (ADR-0023), capped at one per player per week. */
type PickWeight = 'L' | 'M' | 'H' | 'A';

export type WeeklyAwardId = 'game-ball' | 'contrarian-win' | 'bullseye';

/** Canonical ordering used everywhere awards are listed. */
export const WEEKLY_AWARD_ORDER: WeeklyAwardId[] = ['game-ball', 'contrarian-win', 'bullseye'];

// --- Inputs (shaped from matview rows; all fields already non-null) ---

/** Per-player weekly scoring, from stats_season_trend. */
export type WeeklyPointsEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  week_points: number;
};

/**
 * Per-settled-pick outcome and declared weight, from group_pick_cover. That view also carries
 * `cover_margin`; no surviving award ranks on it since #866, so it is deliberately not read.
 */
export type WeeklyCoverEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  game_id: string;
  outcome: PickOutcome;
  /** Conviction as declared at lock — the same value grading scored the pick on. */
  weight: PickWeight;
};

/** Per-settled-pick consensus context, from group_pick_consensus. */
export type WeeklyConsensusEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  game_id: string;
  /** Share of the group (0–100) that took the same side as this pick. */
  consensus_pct: number;
  is_minority: boolean;
  outcome: PickOutcome;
};

export type WeeklyAwardInputs = {
  points: WeeklyPointsEntry[];
  covers: WeeklyCoverEntry[];
  consensus: WeeklyConsensusEntry[];
};

// --- Outputs ---

export type WeeklyAwardHolder = { user_id: string; display_name: string };

type WeeklyAwardBase = {
  id: WeeklyAwardId;
  label: string;
  /** Short name for the award tile chip ("Game Ball"). */
  short: string;
  emoji: string;
  description: string;
  /** Everyone tied on the ranked stat — co-winners (#770). Always at least one. */
  holders: WeeklyAwardHolder[];
};

/**
 * One minted weekly award, its detail field discriminated by `id`. Bullseye carries none: an
 * All-In is one per player per week, so co-winners hold *different* picks and no single number
 * describes the award without misreporting one of them.
 */
export type WeeklyAward =
  | (WeeklyAwardBase & { id: 'game-ball'; points: number })
  | (WeeklyAwardBase & { id: 'contrarian-win'; consensus_pct: number })
  | (WeeklyAwardBase & { id: 'bullseye' });

/** All awards minted for a single fully-graded scoring week, in canonical order. */
export type WeeklyHardware = {
  week_number: number;
  awards: WeeklyAward[];
};

export const WEEKLY_AWARD_FLAVORS: Record<
  WeeklyAwardId,
  { label: string; short: string; emoji: string; description: string }
> = {
  'game-ball': {
    label: 'Game Ball of the Week',
    short: 'Game Ball',
    emoji: '🏈',
    description: 'Most points in the room this week. No argument.'
  },
  'contrarian-win': {
    label: 'Contrarian Win of the Week',
    short: 'Contrarian',
    emoji: '🃏',
    description: 'Won the pick almost nobody else would touch.'
  },
  bullseye: {
    label: 'Bullseye of the Week',
    short: 'Bullseye',
    emoji: '🎯',
    description: 'Declared All-In in front of everyone — and hit it.'
  }
};

// --- Selection primitives ---

type IdentifiedRow = { user_id: string; display_name: string; game_id?: string };

/**
 * Deterministic identity tie-break shared by every selector: display_name, then user_id, then
 * game_id. All three are stable, so the order is total and input-order independent.
 */
function byIdentity(a: IdentifiedRow, b: IdentifiedRow): number {
  const byName = a.display_name.localeCompare(b.display_name);
  if (byName !== 0) return byName;
  if (a.user_id !== b.user_id) return a.user_id < b.user_id ? -1 : 1;
  const ag = a.game_id ?? '';
  const bg = b.game_id ?? '';
  if (ag !== bg) return ag < bg ? -1 : 1;
  return 0;
}

/**
 * Every row tied at the best `rank` (higher wins), in `byIdentity` order (#770). Exact equality
 * is the tie test: inputs come from one matview computation, so there is no float drift to
 * absorb. Returns [] only for empty input.
 */
function allBestBy<T extends IdentifiedRow>(rows: T[], rank: (r: T) => number): T[] {
  if (rows.length === 0) return [];
  const best = rows.reduce((m, r) => Math.max(m, rank(r)), -Infinity);
  return rows.filter((r) => rank(r) === best).sort(byIdentity);
}

/**
 * Tied rows → holders, one per player. Per-pick awards can supply two rows for one player; they
 * are still one co-winner. Input arrives sorted, so first-wins dedupe keeps display order.
 */
function holdersOf(rows: IdentifiedRow[]): WeeklyAwardHolder[] {
  const seen = new Set<string>();
  const holders: WeeklyAwardHolder[] = [];
  for (const r of rows) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    holders.push({ user_id: r.user_id, display_name: r.display_name });
  }
  return holders;
}

// --- Selectors (co-winners throughout, or null when nobody qualifies) ---

/**
 * Game Ball: most points that week (stats_season_trend). Null only on an empty week, so a flat
 * week crowns everybody — still true, and since #866 cut Donkey there is no bottom-end mirror
 * this had to stay asymmetric with.
 */
export function gameBallOfWeek(
  points: WeeklyPointsEntry[]
): { holders: WeeklyAwardHolder[]; points: number } | null {
  const best = allBestBy(points, (p) => p.week_points);
  if (best.length === 0) return null;
  return { holders: holdersOf(best), points: best[0].week_points };
}

/** Contrarian Win: the lowest-consensus minority pick that won (group_pick_consensus). */
export function contrarianWinOfWeek(
  consensus: WeeklyConsensusEntry[]
): { holders: WeeklyAwardHolder[]; consensus_pct: number } | null {
  // Loneliest = lowest consensus_pct: negate so allBestBy finds the minimum.
  const lone = allBestBy(
    consensus.filter((c) => c.is_minority && c.outcome === 'win'),
    (c) => -c.consensus_pct
  );
  if (lone.length === 0) return null;
  return { holders: holdersOf(lone), consensus_pct: lone[0].consensus_pct };
}

/**
 * Bullseye: every player whose declared All-In won (#866). A qualification, not a ranking —
 * hence no `allBestBy`. A lost or pushed All-In mints nothing: the award is for a call that
 * landed, not the nerve to make it (that is The Whale's job, and it has a rate behind it).
 */
export function bullseyeOfWeek(
  covers: WeeklyCoverEntry[]
): { holders: WeeklyAwardHolder[] } | null {
  const hits = covers.filter((c) => c.weight === 'A' && c.outcome === 'win').sort(byIdentity);
  if (hits.length === 0) return null;
  return { holders: holdersOf(hits) };
}

// --- Assembly ---

function flavorFor<Id extends WeeklyAwardId>(
  id: Id
): { id: Id; label: string; short: string; emoji: string; description: string } {
  const f = WEEKLY_AWARD_FLAVORS[id];
  return { id, label: f.label, short: f.short, emoji: f.emoji, description: f.description };
}

function distinctWeeks(inputs: WeeklyAwardInputs): number[] {
  const weeks = new Set<number>();
  for (const p of inputs.points) weeks.add(p.week_number);
  for (const c of inputs.covers) weeks.add(c.week_number);
  for (const c of inputs.consensus) weeks.add(c.week_number);
  return [...weeks].sort((a, b) => a - b);
}

/**
 * Mint every week's hardware from pre-fetched season inputs — one entry per week that produced
 * an award, newest first (the order the recap surface reads), each week's awards in
 * WEEKLY_AWARD_ORDER. Pure and deterministic.
 */
export function computeWeeklyHardware(inputs: WeeklyAwardInputs): WeeklyHardware[] {
  const result: WeeklyHardware[] = [];
  for (const week of distinctWeeks(inputs)) {
    const points = inputs.points.filter((p) => p.week_number === week);
    const covers = inputs.covers.filter((c) => c.week_number === week);
    const consensus = inputs.consensus.filter((c) => c.week_number === week);

    const awards: WeeklyAward[] = [];

    const gameBall = gameBallOfWeek(points);
    if (gameBall)
      awards.push({
        ...flavorFor('game-ball'),
        holders: gameBall.holders,
        points: gameBall.points
      });

    const contrarian = contrarianWinOfWeek(consensus);
    if (contrarian)
      awards.push({
        ...flavorFor('contrarian-win'),
        holders: contrarian.holders,
        consensus_pct: contrarian.consensus_pct
      });

    const bullseye = bullseyeOfWeek(covers);
    if (bullseye) awards.push({ ...flavorFor('bullseye'), holders: bullseye.holders });

    if (awards.length > 0) result.push({ week_number: week, awards });
  }
  return result.sort((a, b) => b.week_number - a.week_number);
}
