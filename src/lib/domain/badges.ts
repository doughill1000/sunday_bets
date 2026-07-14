import type {
  BadgeAward,
  BadgeGlossaryEntry,
  BadgeHolder,
  BadgeId,
  BadgeKind
} from '$lib/types/honors';
import type { ConsensusStatsEntry, LineSideStatsEntry, SeasonStats } from '$lib/types/server/stats';
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

export type BadgeTrendEntry = {
  user_id: string;
  display_name: string;
  week_number: number;
  week_wins: number;
  week_losses: number;
  week_missed: number;
  /** Raw points scored this week (#397 comeback/weekly honors). */
  week_points: number;
  /** Dense rank on cumulative points as of this week, ties share a rank (#397). */
  cumulative_rank_this_week: number;
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

// `headToHead`, `teamAccuracy` and `streaks` were dropped from BadgeInputs in #647 along
// with the only badges that read them (The Nemesis, The Homer, Hot Hand). The matviews
// behind them — `stats_head_to_head`, `stats_accuracy_by_team`, `stats_pick_streaks` —
// have other consumers (`/stats`, `/market`, the recap facts builders) and are untouched.
export type BadgeInputs = {
  seasonTotals: BadgeSeasonTotalsEntry[];
  weightAccuracy: BadgeWeightEntry[];
  trend: BadgeTrendEntry[];
  /** Per-user consensus aggregates for Tier-B badges (#294). */
  consensus: BadgeConsensusEntry[];
  /** Per-user favorite-vs-underdog pick mix for line-side badges (#317). */
  lineSide: BadgeLineSideEntry[];
};

/**
 * Projects the season stats a `/stats` load already fetches into `BadgeInputs`, so the
 * badge engine reuses those rows instead of re-querying the same matviews
 * (`leaderboard_season_totals`, `stats_accuracy_by_weight`, `stats_season_trend`,
 * `group_pick_consensus`, `stats_accuracy_by_line_side`). Pure: only narrows
 * already-non-null fields, no DB access. See `getStatsForSeason` / `getSeasonLeaderboard`.
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
    trend: season.trend.map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      week_number: r.week_number,
      week_wins: r.week_wins,
      week_losses: r.week_losses,
      week_missed: r.week_missed,
      week_points: r.week_points,
      cumulative_rank_this_week: r.cumulative_rank_this_week
    })),
    consensus: season.consensusStats.map((c: ConsensusStatsEntry): BadgeConsensusEntry => ({
      user_id: c.user_id,
      display_name: c.display_name,
      decisions: c.decisions,
      mean_consensus_pct: c.mean_consensus_pct,
      contrarian_picks: c.contrarian_picks,
      contrarian_wins: c.contrarian_wins,
      majority_picks: c.majority_picks,
      majority_wins: c.majority_wins
    })),
    lineSide: season.lineSide.map((l: LineSideStatsEntry): BadgeLineSideEntry => ({
      user_id: l.user_id,
      display_name: l.display_name,
      decisions: l.decisions,
      chalk_picks: l.chalk_picks,
      dog_picks: l.dog_picks
    }))
  };
}

// Thresholds
const MIN_SAMPLE_DECISIONS = 5;
const SAMPLE_FRACTION = 0.35;

/**
 * Minimum graded All-In decisions (wins + losses) for The Whale and The Choker.
 * A small fixed guard rather than the season-scaled `computeSampleGuard`: All-In volume
 * is a choice, not a function of the schedule, and it varies wildly between players in
 * the same season (2025 ranged from 0 to 28), so a guard scaled off the league average
 * would gate out whoever went all in least while saying nothing about sample quality.
 */
export const WHALE_MIN_ALLINS = 3;

/**
 * The Whale's bar: an All-In record must be a *winning* one. The 50% is not a tuned
 * parameter — a spread pick is a coin flip by construction, so 50% is the zero the world
 * hands us, and a "went all in and it paid" badge below its own zero is a lie. Without
 * this, the badge crowns the best All-In rate even when that rate is losing (2024's
 * holder went 10-12).
 */
export const WHALE_MIN_WIN_RATE = 0.5;

/**
 * The Oracle / The Lemming bars. Both are verdict badges — their zero is 50%, given by
 * the world — so each needs a distance past it before "bucked the crowd and won" or
 * "followed the herd off the cliff" is a claim about the player rather than about noise.
 * On 2022-25 these fire twice each in four seasons and go dark twice.
 */
export const ORACLE_MIN_RATE = 0.55;
export const LEMMING_MAX_RATE = 0.45;

/**
 * Lean-axis bars, in the units of their own measure (both are fractions).
 *
 * They differ because they are different measures on different scales, not because one
 * end is stricter: 0.05 is ~1.9 standard errors of a fade rate over ~250 picks, and 0.15
 * is ~2.4 standard errors of a chalk-minus-dog gap. These deliberately do not reuse
 * `TENDENCY_LEAN_THRESHOLD` (`$lib/utils/stats`), the shared 0.1 the line axis borrowed
 * from the `/stats` tile — with a league-mean zero (#649) that value lights both ends of
 * both axes in every season on record.
 *
 * Lean badges describe style, not achievement, so they are pitched to fire roughly once
 * a season rather than to Perfect Week's rarity: a contrarian isn't rare, he's a
 * contrarian. Each axis can still go dark, and does (crowd lean 2022, line lean 2023).
 */
export const CROWD_LEAN_BAR = 0.05;
export const LINE_LEAN_BAR = 0.15;

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
 * Scales with average contrarian-pick count across the league — its own denominator,
 * which is what keeps it honest where the other guards went vacuous.
 */
export function computeOracleGuard(consensus: BadgeConsensusEntry[]): number {
  if (consensus.length === 0) return MIN_SAMPLE_DECISIONS;
  const avg = consensus.reduce((s, c) => s + c.contrarian_picks, 0) / consensus.length;
  return Math.max(MIN_SAMPLE_DECISIONS, Math.round(avg * SAMPLE_FRACTION));
}

/**
 * Season-scaled minimum majority picks for Lemming eligibility.
 *
 * The Lemming used to reuse `computeOracleGuard` — a guard scaled off `contrarian_picks`
 * (~18/season) applied to `majority_picks` (~198/season), so it gated on roughly a tenth
 * of the sample it was meant to protect. It changed no outcome on 2022-25, but a guard
 * computed on one measure and applied to another is only ever accidentally right (#648).
 */
export function computeLemmingGuard(consensus: BadgeConsensusEntry[]): number {
  if (consensus.length === 0) return MIN_SAMPLE_DECISIONS;
  const avg = consensus.reduce((s, c) => s + c.majority_picks, 0) / consensus.length;
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
 * The Whale: the best All-In win rate in the room, above a minimum-sample guard
 * (ADR-0023 Decision point 6) **and above 50%** (`WHALE_MIN_WIN_RATE`).
 *
 * The bar is what makes this a verdict rather than a ranking. Conviction is negatively
 * predictive in this league by about 14 points — 2022-25 the room went 50-90 (35.7%) on
 * All-Ins against roughly 50% on ordinary picks — so the top of a sorted list is usually
 * still a losing record, and the badge shipped crowning it (2024: 10-12, flavored "the
 * house pays this one"). With the bar it fires once in four seasons, for the one player
 * who actually did it. That rarity is the point: the badge measures exactly what the
 * rating deliberately discards (ADR-0032 v2 made the rating conviction-flat, and this
 * data is why), so it should only fire when conviction genuinely paid.
 */
function theWhale(weights: BadgeWeightEntry[], guard: number): BadgeHolder | null {
  const allins = weights.filter((w) => w.weight === 'A' && w.wins + w.losses >= guard);
  const winning = allins.filter((w) => w.wins / (w.wins + w.losses) > WHALE_MIN_WIN_RATE);
  if (winning.length === 0) return null;
  return holder(
    winning.reduce((best, curr) => {
      const currRate = curr.wins / (curr.wins + curr.losses);
      const bestRate = best.wins / (best.wins + best.losses);
      if (currRate > bestRate) return curr;
      if (currRate === bestRate) {
        if (curr.decisions > best.decisions) return curr;
        if (curr.decisions === best.decisions) return alphaFirst(curr, best);
      }
      return best;
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

// The Nemesis and The Homer used to live here. Both were cut in #647.
//
// The Nemesis ("owns the head-to-head") reduced on raw `wins`, making it a volume award —
// 2025 went to a 256-247 (.5089) player over a 248-191 (.5649) one. The obvious fix, a
// rate, is exactly the road ADR-0035 §1 closes: in a league where everyone picks the same
// games, aggregate head-to-head rate *is* cover rate wearing a different hat, and it
// picked the same player as the #1 cover rate in all four seasons on record.
//
// The Homer ("rides one team all season") measured a trait this format cannot express.
// Every player picks every game, so the largest possible share of a season on one team is
// 17/272 = 6.25%, random play sits at ~5.1%, and the league's four-season range is
// 4.4%-6.5%. The whole signal band is a point wide and bounded by the schedule, not by
// behaviour. No bar separates a homer from a coin flip.

// --- Tier-B consensus badge helpers (#294, #316) ---

// Lone Wolf / The Sheep used to live here as two bespoke `reduce` calls that always
// crowned the ends of a sorted list. They are now the two ends of `crowdLeanAxis` (#635).

/**
 * Oracle: best contrarian-pick win rate, above a season-scaled minimum sample **and above
 * `ORACLE_MIN_RATE`**. Verdict badge — only picks made against the majority
 * (is_minority = true) count, and its zero is the 50% the world hands any spread pick.
 * Without the bar it crowned the top of a sorted list whether or not bucking the crowd
 * had actually worked; with it, 2024's 51.1% "oracle" correctly resolves to nobody.
 */
function oracle(consensus: BadgeConsensusEntry[], oracleGuard: number): BadgeHolder | null {
  const eligible = consensus.filter(
    (c) =>
      c.contrarian_picks >= oracleGuard &&
      c.contrarian_picks > 0 &&
      c.contrarian_wins / c.contrarian_picks >= ORACLE_MIN_RATE
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
 * The Lemming: worst majority-pick win rate, above its own season-scaled minimum sample
 * (`computeLemmingGuard`, not the Oracle's) **and at or below `LEMMING_MAX_RATE`**.
 * Verdict badge — flock-side mirror of oracle(); uses majority_picks / majority_wins.
 *
 * The bar is what stops it lying. Unbarred it went to a player on a 52.2% *winning*
 * record in 2024, in a season where all six players finished winning — the badge said
 * following the crowd cost him while he was beating the market.
 */
function theLemming(consensus: BadgeConsensusEntry[], lemmingGuard: number): BadgeHolder | null {
  const eligible = consensus.filter(
    (c) =>
      c.majority_picks >= lemmingGuard &&
      c.majority_picks > 0 &&
      c.majority_wins / c.majority_picks <= LEMMING_MAX_RATE
  );
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

// --- Badge axis layer (#635) ---
//
// A paired badge is not "whoever is at the end of a sorted list" — it is "whoever is
// genuinely out on one end of a measure". An axis declares one measure, two ends, an
// honest zero, and a bar. Each end awards independently: most extreme on its side AND
// clear of the bar. So an axis yields 0, 1, or 2 titles, and which one is a fact about
// the season rather than a rule about the schema.
//
// This is not a new idea in this file, just an unevenly-applied one: `donkeyOfWeek` and
// `theCardiac` already return null when nothing happened, and `lineSideTendency`
// (`$lib/utils/stats`) already withholds inside a ±10-point dead zone. The paired titles
// were the last place a sorted list was treated as proof — which is why the app could
// crown a 🧱 Chalk Eater on a 54% favorite share while `/stats` called the same player
// balanced. ADR-0035 records the underlying rule: a badge that cannot honestly say
// "nobody" is suspect.

/**
 * One end of an axis: which side of the zero it claims, and the badge it awards.
 * `lo` sits below the zero, `hi` above it.
 */
type AxisSide = 'lo' | 'hi';

type AxisDef<Row extends { user_id: string; display_name: string }> = {
  /** Short name of the measure, used as the awards-card heading. */
  measure: string;
  /** The badge each end awards. */
  ends: Record<AxisSide, BadgeId>;
  /**
   * The player's position on the measure, or null when they are ineligible (thin sample).
   * Ineligible rows take no part in the "most extreme" comparison.
   */
  value: (row: Row) => number | null;
  /**
   * The honest zero — the value that means "no lean at all", computed from the eligible
   * rows each season. For a lean measure that zero is **the room**: nothing in the world
   * says how contrarian a player "should" be, or how often they "should" take the dog, so
   * the only non-arbitrary anchor is where this league sat this season (#649, ADR-0035).
   */
  zero: (rows: Row[]) => number;
  /** Minimum distance from the zero before an end awards, in the measure's own units. */
  bar: number;
  /** Volume tie-break: more of this wins when two players sit at the same value. */
  sample: (row: Row) => number;
};

/**
 * Awards one axis: 0, 1, or 2 titles. An end awards only when some eligible player is
 * both the most extreme on that side of the zero and at least `bar` away from it.
 *
 * Ties resolve exactly as the bespoke `reduce` calls this replaced did — larger sample
 * first, then alphabetically — so migrating a pair onto an axis changes only whether a
 * badge is deserved, never who gets it when two players tie.
 */
function awardAxis<Row extends { user_id: string; display_name: string }>(
  axis: AxisDef<Row>,
  rows: Row[]
): BadgeAward[] {
  const eligible = rows.filter((r) => axis.value(r) !== null);
  if (eligible.length === 0) return [];

  const zero = axis.zero(eligible);
  const awards: BadgeAward[] = [];

  for (const side of ['lo', 'hi'] as const) {
    // Distance from the zero, signed so that "further out on my side" is always larger.
    const deviation = (r: Row) => (side === 'lo' ? zero - axis.value(r)! : axis.value(r)! - zero);

    const cleared = eligible.filter((r) => deviation(r) >= axis.bar);
    if (cleared.length === 0) continue; // This end is unclaimed — a fact, not a failure.

    const winner = cleared.reduce((best, curr) => {
      if (deviation(curr) > deviation(best)) return curr;
      if (deviation(curr) === deviation(best)) {
        if (axis.sample(curr) > axis.sample(best)) return curr;
        if (axis.sample(curr) === axis.sample(best)) return alphaFirst(curr, best);
      }
      return best;
    });
    awards.push(award(axis.ends[side], 'title', [holder(winner)]));
  }

  return awards;
}

/** The mean of an axis measure across the eligible rows — the room, as a number. */
function leagueMean<Row extends { user_id: string; display_name: string }>(
  rows: Row[],
  value: (row: Row) => number | null
): number {
  const vals = rows.map(value).filter((v): v is number => v !== null);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/**
 * Line lean: favorite-vs-underdog pick mix (#317, put on an axis in #635, given its real
 * zero in #649). The measure is the *gap* between the two shares — using the gap rather
 * than the favorite share alone keeps pick'em games diluting both ends equally.
 *
 * **The zero is the league, not an even split.** This axis shipped with `zero: () => 0`,
 * an absolute 50/50, and the room is never at zero because the lines aren't: the league
 * mean ran -9.4 (2025), -13.3 (2024), -11.3 (2023), -5.6 (2022) — dog-side every single
 * year. Measuring against an absolute therefore measured *the schedule*, and Dog Lover
 * fired 4 seasons out of 4 while Chalk Eater fired 1. An axis where one end is an annual
 * gift and the other is nearly unreachable is not an axis.
 *
 * Note this deliberately breaks step with `lineSideTendency`'s ±10 dead zone on `/stats`:
 * that tile answers "does this player take dogs or chalk", an absolute question with an
 * absolute zero, and it is right to keep answering it that way. The badge answers "is
 * this player out on an end *of this room*", so it needs the room's zero. Same numbers,
 * different questions — see #649.
 */
function lineLeanAxis(guard: number): AxisDef<BadgeLineSideEntry> {
  const value = (l: BadgeLineSideEntry) =>
    l.decisions >= guard && l.decisions > 0 ? (l.chalk_picks - l.dog_picks) / l.decisions : null;
  return {
    measure: 'Line lean',
    ends: { lo: 'dog-lover', hi: 'chalk-eater' },
    value,
    zero: (rows) => leagueMean(rows, value),
    bar: LINE_LEAN_BAR,
    sample: (l) => l.decisions
  };
}

/**
 * Crowd lean: how far a player sits from the room's own contrarianism (#294, #316; put on
 * an axis in #635, lit for the first time in #649).
 *
 * **The measure is fade rate** — the share of a player's picks that were the minority
 * side — not `mean_consensus_pct`, the average size of the crowd a player happened to sit
 * in. Fade rate is what the badge names actually claim. It needs no new SQL: `is_minority`
 * strictly partitions every pick, so `contrarian_picks + majority_picks === decisions`.
 *
 * **The zero is the room, recomputed per season**, and 2022 is why that has to be per
 * season rather than a constant. League mean fade rate ran 21.0% (2025), 20.3% (2024),
 * 21.2% (2023) — then 28.2% (2022). That outlier is mechanical, not behavioural: 2022 had
 * five pickers, and with six a 3-3 split makes nobody a minority (`is_minority` is
 * `pct < 0.5`, and 50 is not), while with five every non-unanimous split produces
 * contrarians. A hardcoded 21% would have made the whole 2022 field look like wolves for
 * a reason that has nothing to do with 2022. Against its own room, 2022 correctly goes
 * dark.
 */
function crowdLeanAxis(guard: number): AxisDef<BadgeConsensusEntry> {
  const value = (c: BadgeConsensusEntry) =>
    c.decisions >= guard && c.decisions > 0 ? c.contrarian_picks / c.decisions : null;
  return {
    measure: 'Crowd lean',
    ends: { lo: 'sheep', hi: 'lone-wolf' },
    value,
    zero: (rows) => leagueMean(rows, value),
    bar: CROWD_LEAN_BAR,
    sample: (c) => c.decisions
  };
}

// Hot Hand ("longest win streak") lived here until #647. It measured luck: the best
// streaks on record are 10, 9, 9, 8, and the expected longest run for the luckiest of six
// ~270-pick coin-flip seasons is 9-10, so the winners sat exactly where chance puts them.
// No bar repairs that, because the quantity carries no skill signal to threshold.
//
// The streak idea survives, on the surface that fits it: a *live* streak is fun precisely
// because it is fragile and about to break, which is why it belongs on the sweat board as
// in-week status rather than on the honors shelf as a season title (#652).

// --- Comeback & weekly honors (#397): non-scoring recognition, ADR-0020 ---

/**
 * The Comeback: biggest rank climb from a player's season low point (their worst
 * cumulative_rank_this_week) to their final week's rank. Season-end only — the "low
 * point" isn't meaningful until the season stops adding weeks. No holder if nobody's
 * final rank beat their own low point.
 */
function theComeback(trend: BadgeTrendEntry[], seasonComplete: boolean): BadgeHolder | null {
  if (!seasonComplete) return null;
  const byUser = new Map<string, BadgeTrendEntry[]>();
  for (const r of trend) {
    const rows = byUser.get(r.user_id);
    if (rows) rows.push(r);
    else byUser.set(r.user_id, [r]);
  }

  type Candidate = { user_id: string; display_name: string; delta: number };
  const climbers: Candidate[] = [];
  for (const rows of byUser.values()) {
    const sorted = [...rows].sort((a, b) => a.week_number - b.week_number);
    const finalRow = sorted[sorted.length - 1];
    const lowPointRank = Math.max(...rows.map((r) => r.cumulative_rank_this_week));
    const delta = lowPointRank - finalRow.cumulative_rank_this_week; // positive = climbed
    if (delta > 0) {
      climbers.push({ user_id: finalRow.user_id, display_name: finalRow.display_name, delta });
    }
  }
  if (climbers.length === 0) return null;
  return holder(
    climbers.reduce((best, curr) => {
      if (curr.delta > best.delta) return curr;
      if (curr.delta === best.delta) return alphaFirst(curr, best);
      return best;
    })
  );
}

/**
 * The single highest week_points in a set of same-week rows, or **null when the week's top
 * score is tied**. A tied week was led by nobody, so it credits nobody (#651).
 *
 * #634 applied this rule one level up (a tie on the season-long "most weeks led" tally now
 * resolves to nobody) but left the per-week tally underneath still calling `alphaFirst`,
 * which silently credited a tied week to whoever sorted first — meaning a player late in
 * the alphabet could never win one. `bestOfTheRest` already counts every player who tied
 * for a week's top score; this makes the two agree.
 */
function weeklyTopScorer(rows: BadgeTrendEntry[]): BadgeTrendEntry | null {
  if (rows.length === 0) return null;
  const maxPoints = Math.max(...rows.map((r) => r.week_points));
  const leaders = rows.filter((r) => r.week_points === maxPoints);
  return leaders.length === 1 ? leaders[0] : null;
}

/**
 * Week Winner: led weekly scoring (sole highest week_points that week) in more weeks than
 * anyone else. Always eligible to award — not season-end gated, since it's a running
 * tally, not a final-standing judgment. Requires sole possession of the top tally: a tie
 * at the top awards nobody (matching theCardiac/donkeyOfWeek). Weeks that were themselves
 * tied are led by nobody and simply don't enter the tally.
 */
function weekWinner(trend: BadgeTrendEntry[]): BadgeHolder | null {
  const weeks = [...new Set(trend.map((r) => r.week_number))];
  const tally = new Map<string, { user_id: string; display_name: string; weeksLed: number }>();
  for (const w of weeks) {
    const top = weeklyTopScorer(trend.filter((r) => r.week_number === w));
    if (!top) continue;
    const acc = tally.get(top.user_id);
    if (acc) acc.weeksLed++;
    else
      tally.set(top.user_id, { user_id: top.user_id, display_name: top.display_name, weeksLed: 1 });
  }
  const candidates = [...tally.values()];
  if (candidates.length === 0) return null;
  const maxWeeksLed = Math.max(...candidates.map((c) => c.weeksLed));
  const leaders = candidates.filter((c) => c.weeksLed === maxWeeksLed);
  if (leaders.length !== 1) return null;
  return holder(leaders[0]);
}

/**
 * Cardiac: the player who ends the season as sole leader, but only if they first
 * reached sole possession of 1st within the final one or two weeks (i.e. they held no
 * share of 1st — sole or tied — any earlier). Season-end only; no holder if the final
 * week is tied at 1st, or the eventual leader was already leading earlier.
 */
function theCardiac(trend: BadgeTrendEntry[], seasonComplete: boolean): BadgeHolder | null {
  if (!seasonComplete || trend.length === 0) return null;
  const finalWeek = Math.max(...trend.map((r) => r.week_number));
  const finalWeekLeaders = trend.filter(
    (r) => r.week_number === finalWeek && r.cumulative_rank_this_week === 1
  );
  if (finalWeekLeaders.length !== 1) return null;
  const leader = finalWeekLeaders[0];
  const ledEarlier = trend.some(
    (r) =>
      r.user_id === leader.user_id &&
      r.week_number <= finalWeek - 2 &&
      r.cumulative_rank_this_week === 1
  );
  if (ledEarlier) return null;
  return holder(leader);
}

/**
 * Best of the Rest: every player who posted a week's single highest score (alphaFirst
 * excluded — ties for the week's top score all qualify) while sitting in the bottom
 * half of the standings that week (cumulative_rank_this_week > half the active field),
 * at least once this season. Milestone — zero or more holders, not season-end gated.
 */
function bestOfTheRest(trend: BadgeTrendEntry[]): BadgeHolder[] {
  const weeks = [...new Set(trend.map((r) => r.week_number))];
  const seen = new Map<string, BadgeHolder>();
  for (const w of weeks) {
    const rows = trend.filter((r) => r.week_number === w);
    if (rows.length === 0) continue;
    const maxPoints = Math.max(...rows.map((r) => r.week_points));
    const fieldSize = rows.length;
    for (const r of rows) {
      if (r.week_points === maxPoints && r.cumulative_rank_this_week > fieldSize / 2) {
        seen.set(r.user_id, { user_id: r.user_id, display_name: r.display_name });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

// --- Milestone badge helpers (threshold: zero or more holders) ---
//
// Big Game Hunter ("went all in — and cashed") was cut here in #647. It counted All-In
// *wins* with no rate and no bar, so it rewarded volume of conviction rather than
// conviction that paid: 2025's holder went 8-20 (28.6%, the worst mark in the room), and
// 2024 gave it to all five All-In players while they went a collective 31-55. Raising the
// count cannot fix a count — that player made 28 All-Ins, clearing any threshold anyone
// would set — and switching it to a rate turns it into The Whale. It had no version that
// was both correct and distinct (ADR-0035: one measure, one surface).

/**
 * The Grinder: missed nothing all season. An attendance **milestone**, not a ranking —
 * everyone who showed up every week earned it, so multiple holders are correct and
 * expected, and there is no tie to break.
 *
 * It was miscast as a title ("placed the most picks this season"), which always crowned
 * the maximum whether or not the maximum meant anything — on the record simply the same
 * player every year, and in 2022 a genuine 208-208 tie decided by D-before-H. Miscasting
 * a threshold as a ranking is the defect; the `alphaFirst` tie-break was only its symptom,
 * which is why it is deleted rather than fixed (#651).
 *
 * **The legacy gate** (`totals.some(t => t.missed > 0)`) restricts this to seasons that
 * actually recorded attendance. The 2022-24 sheet import never wrote a single `missed`
 * row for anyone, so "0 missed" is trivially true for all six players and an ungated
 * badge would award the entire league three seasons running. This is the same gate
 * `theGhost` already applies, so the mirror pair goes dark and lights up together.
 *
 * Known edge, named honestly: a season in which literally nobody missed a pick would go
 * dark precisely when everyone earned it. With six players over 272 games that isn't a
 * real risk (2025: five of six missed something, one missed 133), and if it ever bites,
 * the fix is a real provenance flag on the season, not a cleverer heuristic.
 */
function theGrinder(totals: BadgeSeasonTotalsEntry[]): BadgeHolder[] {
  const attendanceRecorded = totals.some((t) => t.missed > 0);
  if (!attendanceRecorded) return [];
  return totals
    .filter((t) => t.missed === 0)
    .map((t) => ({ user_id: t.user_id, display_name: t.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

/**
 * The Choker: went all in and got shut out — `WHALE_MIN_ALLINS`+ All-Ins, zero wins.
 *
 * A **milestone**, not a title: if two players both go 0-for-3+, both choked. That is why
 * it sheds its `alphaFirst` outright (#648) — the redefinition removes the scarcity, so
 * there is no tie left to break.
 *
 * It shipped as "worst All-In win rate" with no guard at all, so it always crowned
 * someone: 2022 handed a season title to a player on a 1-for-1 All-In loss — one pick,
 * one bad night. The shutout gives it the same honest zero The Whale gets, reuses the
 * existing guard rather than inventing a bar, fires exactly once on 2022-25 (a 0-4), and
 * kills the 2022 absurdity for free.
 */
function theChoker(weights: BadgeWeightEntry[], guard: number): BadgeHolder[] {
  return weights
    .filter((w) => w.weight === 'A' && w.wins + w.losses >= guard && w.wins === 0)
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
    description:
      'Missed nothing all season — every slate, every week. Anyone with a perfect attendance record earns it. Only awarded in seasons where attendance was recorded.'
  },
  'the-choker': {
    label: 'The Choker',
    emoji: '😬',
    flavor: 'Went all in… and all in went wrong.',
    description:
      'Went all in at least 3 times and lost every one of them. Nobody earns it in a season where every All-In player won at least once.'
  },
  'the-whale': {
    label: 'The Whale',
    emoji: '🐳',
    flavor: 'Goes big and cashes — the house pays this one.',
    description:
      'Best win rate on All-In picks this season, and a winning one — above 50% on at least 3 All-Ins. Nobody earns it in a season where the best All-In record is losing.'
  },
  'the-ghost': {
    label: 'The Ghost',
    emoji: '👻',
    flavor: 'Showed up for the group chat. Not the picks.',
    description: 'Missed the most picks this season.'
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
      'Takes the minority side at least 5 points more often than the league average this season, further than anyone else (minimum picks required). Measured against this league in this season, not a fixed number.'
  },
  sheep: {
    label: 'The Sheep',
    emoji: '🐑',
    flavor: 'Goes where the group goes. Safety in numbers.',
    description:
      'Takes the minority side at least 5 points less often than the league average this season, further than anyone else (minimum picks required). Measured against this league in this season, not a fixed number.'
  },
  oracle: {
    label: 'The Oracle',
    emoji: '🔮',
    flavor: 'Bucks the crowd and wins. Madness or genius?',
    description:
      'Best win rate on picks made against the majority this season, and at least 55% (minimum picks required). Nobody earns it in a season where bucking the crowd barely beat a coin flip.'
  },
  'the-lemming': {
    label: 'The Lemming',
    emoji: '🐹',
    flavor: 'Followed the herd. Right off the cliff.',
    description:
      'Worst win rate on picks made with the majority this season, and 45% or below (minimum picks required). Nobody earns it in a season where following the crowd still won.'
  },
  // Line-side badges (#317)
  'chalk-eater': {
    label: 'Chalk Eater',
    emoji: '🧱',
    flavor: "Never met a favorite they didn't back.",
    description:
      'Backs favorites at least 15 points more than the league average this season, further than anyone else (minimum picks required). Measured against this league in this season, not an even split.'
  },
  'dog-lover': {
    label: 'Dog Lover',
    emoji: '🐶',
    flavor: 'Loyalty over logic. Always takes the longshot.',
    description:
      'Backs underdogs at least 15 points more than the league average this season, further than anyone else (minimum picks required). Measured against this league in this season, not an even split.'
  },
  // Comeback & weekly honors (#397, ADR-0020)
  'the-comeback': {
    label: 'The Comeback',
    emoji: '🧗',
    flavor: 'Started in the basement. Finished somewhere else entirely.',
    description: 'Climbed further from their season low point to their final rank than anyone else.'
  },
  'week-winner': {
    label: 'Week Winner',
    emoji: '🏆',
    flavor: "Every week's its own title fight — and you keep winning it.",
    description: 'Led the league in weekly scoring more often than anyone else this season.'
  },
  'best-of-the-rest': {
    label: 'Best of the Rest',
    emoji: '🌟',
    flavor: 'Buried in the standings. Unbeatable for a week.',
    description:
      "Posted a week's single highest score at least once while sitting in the bottom half of the standings."
  },
  cardiac: {
    label: 'Cardiac',
    emoji: '💓',
    flavor: 'Never led all year. Then it mattered most.',
    description:
      "Took sole possession of first place for the first time in the season's final week or two."
  }
};

/**
 * Ordered glossary of every possible award for the "Awards legend" modal — titles
 * (one holder per season) first, then milestones (anyone who clears the bar). Order
 * mirrors `computeBadges`. Derived from the same `FLAVORS` slots the engine awards from,
 * so copy stays single-sourced.
 */
const GLOSSARY_ORDER: { id: BadgeId; kind: BadgeKind }[] = [
  { id: 'the-whale', kind: 'title' },
  { id: 'the-ghost', kind: 'title' },
  // Crowd lean (#294, #316) is an axis as of #649 and awards for the first time here: it
  // had no zero and shipped dark, so these two were deliberately absent from this list.
  { id: 'lone-wolf', kind: 'title' },
  { id: 'sheep', kind: 'title' },
  { id: 'oracle', kind: 'title' },
  { id: 'the-lemming', kind: 'title' },
  { id: 'chalk-eater', kind: 'title' },
  { id: 'dog-lover', kind: 'title' },
  // Comeback & weekly honors (#397, ADR-0020)
  { id: 'the-comeback', kind: 'title' },
  { id: 'week-winner', kind: 'title' },
  { id: 'cardiac', kind: 'title' },
  // Milestones: thresholds anyone can clear, so zero or more holders and no tie-break.
  // The Grinder and The Choker moved here from the titles above in #651 / #648 — neither
  // was ever a ranking, and being miscast as one was the whole defect.
  { id: 'the-grinder', kind: 'milestone' },
  { id: 'the-choker', kind: 'milestone' },
  { id: 'perfect-week', kind: 'milestone' },
  { id: 'best-of-the-rest', kind: 'milestone' }
];

export const BADGE_GLOSSARY: BadgeGlossaryEntry[] = GLOSSARY_ORDER.map(({ id, kind }) => ({
  id,
  kind,
  ...FLAVORS[id]
}));

/**
 * The axes, as the UI needs to see them (#635): a measure name, its two ends lo→hi, and
 * what the zero between them means in plain English.
 *
 * The awards card groups by this, and the legend renders one two-faced row per entry.
 * Every axis the engine can award belongs here, and only those: listing an unearnable
 * badge in a legend promises something the engine will never deliver. Crowd lean joined
 * line lean here in #649, in the same commit that gave it a zero.
 */
export type BadgeAxisEndMeta = {
  id: BadgeId;
  /** Short name of this end, for the card's "<name> end unclaimed" note. */
  name: string;
};

export type BadgeAxisMeta = {
  measure: string;
  /** [lo, hi] — the order the ends render in, low side of the zero first. */
  ends: [BadgeAxisEndMeta, BadgeAxisEndMeta];
  /** What sitting at the zero means, shown between the two faces in the legend. */
  zeroLabel: string;
};

export const BADGE_AXES: BadgeAxisMeta[] = [
  {
    measure: 'Line lean',
    ends: [
      { id: 'dog-lover', name: 'Dog' },
      { id: 'chalk-eater', name: 'Chalk' }
    ],
    zeroLabel: 'Picking dogs and chalk about as often as the rest of the league'
  },
  {
    measure: 'Crowd lean',
    ends: [
      { id: 'sheep', name: 'Flock' },
      { id: 'lone-wolf', name: 'Wolf' }
    ],
    zeroLabel: 'Fading the group about as often as the rest of the league'
  }
];

/** The badge ids that belong to an axis, so the card can render the rest as plain titles. */
export const AXIS_BADGE_IDS: ReadonlySet<BadgeId> = new Set(
  BADGE_AXES.flatMap((a) => a.ends.map((e) => e.id))
);

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
 * @param seasonComplete - true when the season has completed; gates the badges whose
 *   answer isn't meaningful until the season stops adding weeks (The Comeback, Cardiac).
 */
export function computeBadges(inputs: BadgeInputs, seasonComplete = false): BadgeAward[] {
  const { seasonTotals, weightAccuracy, trend, consensus, lineSide } = inputs;
  const guard = computeSampleGuard(seasonTotals);
  const badges: BadgeAward[] = [];

  // Tier-A: superlative titles
  const whale = theWhale(weightAccuracy, WHALE_MIN_ALLINS);
  if (whale) badges.push(award('the-whale', 'title', [whale]));

  const ghost = theGhost(seasonTotals);
  if (ghost) badges.push(award('the-ghost', 'title', [ghost]));

  // Tier-A: milestone badges
  const grinders = theGrinder(seasonTotals);
  if (grinders.length > 0) badges.push(award('the-grinder', 'milestone', grinders));

  const chokers = theChoker(weightAccuracy, WHALE_MIN_ALLINS);
  if (chokers.length > 0) badges.push(award('the-choker', 'milestone', chokers));

  const perfecters = perfectWeek(trend);
  if (perfecters.length > 0) badges.push(award('perfect-week', 'milestone', perfecters));

  // Tier-B: consensus badges (#294, #316). The crowd-lean pair awards through its axis
  // (#635), live since #649 gave it a league-mean zero. Oracle and The Lemming are verdict
  // badges on a different measure (how minority/majority picks turned out), not two ends
  // of one lean, so they stay as they are.
  if (consensus.length > 0) {
    badges.push(...awardAxis(crowdLeanAxis(guard), consensus));

    const oracleHolder = oracle(consensus, computeOracleGuard(consensus));
    if (oracleHolder) badges.push(award('oracle', 'title', [oracleHolder]));

    const lemmingHolder = theLemming(consensus, computeLemmingGuard(consensus));
    if (lemmingHolder) badges.push(award('the-lemming', 'title', [lemmingHolder]));
  }

  // Line-side titles (#317), now the two ends of one axis (#635): 0, 1, or 2 holders.
  badges.push(...awardAxis(lineLeanAxis(guard), lineSide));

  // Comeback & weekly honors (#397, ADR-0020): non-scoring recognition, zero effect
  // on standings.
  if (trend.length > 0) {
    const comeback = theComeback(trend, seasonComplete);
    if (comeback) badges.push(award('the-comeback', 'title', [comeback]));

    const winner = weekWinner(trend);
    if (winner) badges.push(award('week-winner', 'title', [winner]));

    const cardiacHolder = theCardiac(trend, seasonComplete);
    if (cardiacHolder) badges.push(award('cardiac', 'title', [cardiacHolder]));

    const rest = bestOfTheRest(trend);
    if (rest.length > 0) badges.push(award('best-of-the-rest', 'milestone', rest));
  }

  return badges;
}
