// Weekly "hardware" (issue #387): five deterministic, cosmetic awards minted for every
// fully-graded scoring week, plus a per-season shelf that tallies how many of each a
// player has won ("3× Game Ball"). Pure and deterministic in the same spirit as the
// season-badge engine (`src/lib/domain/badges.ts`): the selectors take pre-fetched
// matview rows and return award holders with stable tie-breaks and no side effects.
//
// The five awards and their sources:
//   Game Ball of the Week  — most points that week          (stats_season_trend.week_points)
//   Donkey of the Week     — fewest points that week        (stats_season_trend.week_points)
//   Bad Beat of the Week   — the loss that came closest to   (group_pick_cover.cover_margin)
//                            covering (greatest, i.e. least-negative, losing cover margin)
//   Backdoor of the Week   — the win that barely covered     (group_pick_cover.cover_margin)
//                            (smallest positive, winning cover margin — mirror of Bad Beat, #636)
//   Contrarian Win of Week — won the loneliest pick          (group_pick_consensus)
//                            (minority winner with the lowest consensus_pct)
//
// The week's points leader was "Sharp of the Week" through #631. "Sharp" already names two
// unrelated things — the season badge `the-sharp` (best season win rate) and the /stats
// credibility tier (ADR-0032) — so a shelf chip reading "3× Sharp" beside a "The Sharp"
// badge claimed a kinship that does not exist. Renamed to the football tradition, which
// says "best performer this week" without borrowing a word the app spends elsewhere. The
// award ids are derived on read (never persisted), so the rename needed no data migration.
//
// Non-scoring rounds (ADR-0016) never reach here: every source matview filters
// `w.is_scoring`, so those weeks contribute no rows and are absent from the week set.

// pick_settlement.outcome / group_pick_consensus.graded_outcome, stated inline to keep
// this domain module free of the generated DB types (matches badges.ts).
type PickOutcome = 'win' | 'loss' | 'push' | 'missed';

export type WeeklyAwardId =
  'game-ball' | 'donkey-of-week' | 'bad-beat' | 'backdoor' | 'contrarian-win';

/** Canonical ordering used everywhere awards are listed (weekly tiles + season shelf). */
export const WEEKLY_AWARD_ORDER: WeeklyAwardId[] = [
  'game-ball',
  'donkey-of-week',
  'bad-beat',
  'backdoor',
  'contrarian-win'
];

// --- Inputs (shaped from matview rows; all fields already non-null) ---

/** Per-player weekly scoring, from stats_season_trend. */
export type WeeklyPointsEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  week_points: number;
};

/** Per-settled-pick cover margin, from group_pick_cover. */
export type WeeklyCoverEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  game_id: string;
  outcome: PickOutcome;
  /** Picked team's margin over the locked spread; < 0 = did not cover (a loss). */
  cover_margin: number;
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
  /** Short name for the season shelf ("3× Game Ball"). */
  short: string;
  emoji: string;
  description: string;
  holder: WeeklyAwardHolder;
};

/**
 * One minted weekly award. The detail field is award-specific (discriminated by `id`):
 * points for Game Ball/Donkey, cover_margin for Bad Beat/Backdoor, consensus_pct for
 * Contrarian Win.
 */
export type WeeklyAward =
  | (WeeklyAwardBase & { id: 'game-ball'; points: number })
  | (WeeklyAwardBase & { id: 'donkey-of-week'; points: number })
  | (WeeklyAwardBase & { id: 'bad-beat'; cover_margin: number })
  | (WeeklyAwardBase & { id: 'backdoor'; cover_margin: number })
  | (WeeklyAwardBase & { id: 'contrarian-win'; consensus_pct: number });

/** All awards minted for a single fully-graded scoring week, in canonical order. */
export type WeeklyHardware = {
  week_number: number;
  awards: WeeklyAward[];
};

/** One award's tally for a player on the season shelf. */
export type ShelfAward = {
  id: WeeklyAwardId;
  short: string;
  emoji: string;
  count: number;
};

/** A player's season shelf: every award they've won this season, most-decorated first. */
export type SeasonShelfEntry = {
  user_id: string;
  display_name: string;
  total: number;
  awards: ShelfAward[];
};

// --- Flavor (hardcoded; the AI voice layer #283 Wave 3 can cite these later) ---

export const WEEKLY_AWARD_FLAVORS: Record<
  WeeklyAwardId,
  { label: string; short: string; emoji: string; description: string }
> = {
  'game-ball': {
    label: 'Game Ball of the Week',
    short: 'Game Ball',
    emoji: '🏈',
    description: 'Scored the most points this week.'
  },
  'donkey-of-week': {
    label: 'Donkey of the Week',
    short: 'Donkey',
    emoji: '🫏',
    description: 'Scored the fewest points this week.'
  },
  'bad-beat': {
    label: 'Bad Beat of the Week',
    short: 'Bad Beat',
    emoji: '💔',
    description: 'Lost the pick that came closest to covering this week.'
  },
  backdoor: {
    label: 'Backdoor of the Week',
    short: 'Backdoor',
    emoji: '🚪',
    description: 'Won the pick that barely covered this week.'
  },
  'contrarian-win': {
    label: 'Contrarian Win of the Week',
    short: 'Contrarian',
    emoji: '🃏',
    description: 'Won the loneliest pick — the lowest-consensus winner this week.'
  }
};

// --- Selection primitives (pure; total-order comparators keep ties deterministic) ---

type IdentifiedRow = { user_id: string; display_name: string; game_id?: string };

/**
 * Deterministic identity tie-break shared by every selector: earlier display_name, then
 * lower user_id, then lower game_id. Returns negative if `a` should rank ahead of `b`.
 * All three fields are stable, so the resulting order is total and input-order independent.
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

/** The single best row under `rank` (higher wins), identity as the deterministic tiebreak. */
function bestBy<T extends IdentifiedRow>(rows: T[], rank: (r: T) => number): T {
  return rows.reduce((best, curr) => {
    const d = rank(curr) - rank(best);
    if (d > 0) return curr;
    if (d === 0 && byIdentity(curr, best) < 0) return curr;
    return best;
  });
}

function holderOf(e: { user_id: string; display_name: string }): WeeklyAwardHolder {
  return { user_id: e.user_id, display_name: e.display_name };
}

// --- Selectors (one holder or null, deterministic) ---

/** Game Ball of the Week: most points. Tie → identity. Null only on an empty week. */
export function gameBallOfWeek(
  points: WeeklyPointsEntry[]
): { holder: WeeklyAwardHolder; points: number } | null {
  if (points.length === 0) return null;
  const best = bestBy(points, (p) => p.week_points);
  return { holder: holderOf(best), points: best.week_points };
}

/**
 * Donkey of the Week: fewest points. Requires 2+ players AND a real spread — if everyone
 * scored the same there is no distinct donkey (and it could never differ from the game ball),
 * so we award nobody. Tie at the bottom → identity.
 */
export function donkeyOfWeek(
  points: WeeklyPointsEntry[]
): { holder: WeeklyAwardHolder; points: number } | null {
  if (points.length < 2) return null;
  const min = Math.min(...points.map((p) => p.week_points));
  const max = Math.max(...points.map((p) => p.week_points));
  if (min === max) return null; // flat week: no donkey
  // Rank by fewest points: negate so bestBy's "higher wins" finds the minimum.
  const worst = bestBy(points, (p) => -p.week_points);
  return { holder: holderOf(worst), points: worst.week_points };
}

/**
 * Bad Beat of the Week: the losing pick that came closest to covering — the greatest
 * (least-negative) cover_margin among losses. Tie → identity. Null if no pick lost.
 */
export function badBeatOfWeek(
  covers: WeeklyCoverEntry[]
): { holder: WeeklyAwardHolder; cover_margin: number } | null {
  const losses = covers.filter((c) => c.outcome === 'loss');
  if (losses.length === 0) return null;
  const worst = bestBy(losses, (c) => c.cover_margin);
  return { holder: holderOf(worst), cover_margin: worst.cover_margin };
}

/**
 * Backdoor of the Week: the winning pick that barely covered — the smallest positive
 * cover_margin among wins. Tie → identity. Null if no pick won. Mirror of badBeatOfWeek (#636).
 */
export function backdoorOfWeek(
  covers: WeeklyCoverEntry[]
): { holder: WeeklyAwardHolder; cover_margin: number } | null {
  const wins = covers.filter((c) => c.outcome === 'win');
  if (wins.length === 0) return null;
  // Narrowest = smallest positive margin: negate so bestBy's "higher wins" finds the minimum.
  const narrowest = bestBy(wins, (c) => -c.cover_margin);
  return { holder: holderOf(narrowest), cover_margin: narrowest.cover_margin };
}

/**
 * Contrarian Win of the Week: the lowest-consensus minority pick that won. Tie → identity.
 * Null if no minority pick won this week.
 */
export function contrarianWinOfWeek(
  consensus: WeeklyConsensusEntry[]
): { holder: WeeklyAwardHolder; consensus_pct: number } | null {
  const hits = consensus.filter((c) => c.is_minority && c.outcome === 'win');
  if (hits.length === 0) return null;
  // Loneliest = lowest consensus_pct: negate so bestBy finds the minimum.
  const lone = bestBy(hits, (c) => -c.consensus_pct);
  return { holder: holderOf(lone), consensus_pct: lone.consensus_pct };
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
 * Mint every week's hardware from pre-fetched season inputs. Returns one entry per week
 * that produced at least one award, newest week first (the recap surface reads it that
 * way). Each week's awards are in WEEKLY_AWARD_ORDER. Pure and deterministic.
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
      awards.push({ ...flavorFor('game-ball'), holder: gameBall.holder, points: gameBall.points });

    const donkey = donkeyOfWeek(points);
    if (donkey)
      awards.push({ ...flavorFor('donkey-of-week'), holder: donkey.holder, points: donkey.points });

    const badBeat = badBeatOfWeek(covers);
    if (badBeat)
      awards.push({
        ...flavorFor('bad-beat'),
        holder: badBeat.holder,
        cover_margin: badBeat.cover_margin
      });

    const backdoor = backdoorOfWeek(covers);
    if (backdoor)
      awards.push({
        ...flavorFor('backdoor'),
        holder: backdoor.holder,
        cover_margin: backdoor.cover_margin
      });

    const contrarian = contrarianWinOfWeek(consensus);
    if (contrarian)
      awards.push({
        ...flavorFor('contrarian-win'),
        holder: contrarian.holder,
        consensus_pct: contrarian.consensus_pct
      });

    if (awards.length > 0) result.push({ week_number: week, awards });
  }
  // Newest week first for the recap surface.
  return result.sort((a, b) => b.week_number - a.week_number);
}

/**
 * Fold a season's weekly hardware into a per-player shelf: how many of each award every
 * player has won, most-decorated first (ties broken alphabetically, then by user_id).
 * Each player's awards are listed in WEEKLY_AWARD_ORDER, count > 0 only.
 */
export function computeSeasonShelf(hardware: WeeklyHardware[]): SeasonShelfEntry[] {
  type Acc = { user_id: string; display_name: string; counts: Map<WeeklyAwardId, number> };
  const byUser = new Map<string, Acc>();

  for (const week of hardware) {
    for (const award of week.awards) {
      const { user_id, display_name } = award.holder;
      let acc = byUser.get(user_id);
      if (!acc) {
        acc = { user_id, display_name, counts: new Map() };
        byUser.set(user_id, acc);
      }
      acc.counts.set(award.id, (acc.counts.get(award.id) ?? 0) + 1);
    }
  }

  const entries: SeasonShelfEntry[] = [...byUser.values()].map((acc) => {
    const awards: ShelfAward[] = WEEKLY_AWARD_ORDER.filter(
      (id) => (acc.counts.get(id) ?? 0) > 0
    ).map((id) => ({
      id,
      short: WEEKLY_AWARD_FLAVORS[id].short,
      emoji: WEEKLY_AWARD_FLAVORS[id].emoji,
      count: acc.counts.get(id) as number
    }));
    const total = awards.reduce((s, a) => s + a.count, 0);
    return { user_id: acc.user_id, display_name: acc.display_name, total, awards };
  });

  return entries.sort(
    (a, b) =>
      b.total - a.total ||
      a.display_name.localeCompare(b.display_name) ||
      (a.user_id <= b.user_id ? -1 : 1)
  );
}
