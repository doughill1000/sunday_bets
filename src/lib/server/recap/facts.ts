// RecapFacts builder: pure, deterministic assembly of settled facts for the AI recap.
// Reads ADR-0013 matviews and #277 read-models; never writes. ADR-0008, boundary 2.
import { supabaseService } from '$lib/supabase/service';
import { computeBadges, badgeInputsFromSeasonStats } from '$lib/domain/badges';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getRecapForWeek } from '$lib/server/db/queries/recaps';
import type {
  RecapFacts,
  SpiceLevel,
  BadTakeKind,
  RecapBadTake,
  RecapRivalry
} from '$lib/types/server/recap';
import type { BadgeAward } from '$lib/types/honors';
import type { WeightCode } from '$lib/types/domain';
import type { Enums } from '$lib/types/supabase';

type PickOutcome = Enums<'pick_outcome'>;

type WeekMeta = { weekNumber: number; seasonYear: number; isFinalWeek: boolean };

async function loadWeekMeta(weekId: number): Promise<WeekMeta> {
  const { data, error } = await supabaseService
    .from('weeks')
    .select('week_number, season_id, seasons!inner(year)')
    .eq('id', weekId)
    .single();
  if (error || !data) throw error ?? new Error('week not found');

  const seasonYear = (data.seasons as { year: number }).year;
  const weekNumber = data.week_number;
  const seasonId = data.season_id;

  // is_final_week: current week == max scoring week in this season (by season_id).
  const { data: maxRow } = await supabaseService
    .from('weeks')
    .select('week_number')
    .eq('season_id', seasonId)
    .eq('is_scoring', true)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const maxWeek = maxRow?.week_number ?? weekNumber + 1;

  return { weekNumber, seasonYear, isFinalWeek: weekNumber >= maxWeek };
}

type GroupMeta = {
  name: string;
  spice: SpiceLevel;
  aiRecapsEnabled: boolean;
  optedOutUserIds: string[];
};

async function loadGroupMeta(groupId: string): Promise<GroupMeta> {
  const [groupRes, cfgRes, membersRes] = await Promise.all([
    supabaseService.from('groups').select('name').eq('id', groupId).single(),
    supabaseService
      .from('group_config')
      .select('spice, ai_recaps_enabled')
      .eq('group_id', groupId)
      .maybeSingle(),
    supabaseService
      .from('group_memberships')
      .select('user_id, ai_recap_opt_out')
      .eq('group_id', groupId)
      .eq('status', 'active')
  ]);
  if (groupRes.error) throw groupRes.error;
  if (membersRes.error) throw membersRes.error;

  const cfg = cfgRes.data;
  const rawSpice = (cfg as { spice?: string } | null)?.spice;
  const spice: SpiceLevel =
    rawSpice === 'mild' || rawSpice === 'medium' || rawSpice === 'spicy' ? rawSpice : 'medium';
  const aiRecapsEnabled =
    (cfg as { ai_recaps_enabled?: boolean } | null)?.ai_recaps_enabled ?? true;
  const optedOutUserIds = (membersRes.data ?? [])
    .filter((m) => (m as { ai_recap_opt_out: boolean }).ai_recap_opt_out)
    .map((m) => m.user_id as string);

  return {
    name: groupRes.data.name,
    spice,
    aiRecapsEnabled,
    optedOutUserIds
  };
}

/** Snapshot shape stored in facts for the badge-diff in subsequent weeks. */
export type BadgeSnapshot = Record<string, string[]>; // badgeId -> [user_id, ...]

export function snapshotBadges(badges: BadgeAward[]): BadgeSnapshot {
  const snap: BadgeSnapshot = {};
  for (const b of badges) {
    snap[b.id] = b.holders.map((h) => h.user_id);
  }
  return snap;
}

export function diffBadges(
  current: BadgeAward[],
  priorSnapshot: BadgeSnapshot
): RecapFacts['badge_changes'] {
  const changes: RecapFacts['badge_changes'] = [];
  for (const badge of current) {
    const prevIds = priorSnapshot[badge.id] ?? [];
    const currIds = badge.holders.map((h) => h.user_id);
    const prevSet = new Set(prevIds);
    const changed = prevIds.length !== currIds.length || currIds.some((id) => !prevSet.has(id));
    if (changed) {
      changes.push({
        badge_label: badge.label,
        new_holders: badge.holders.map((h) => h.display_name),
        prev_holders: prevIds
      });
    }
  }
  return changes;
}

// ── Bad-take selector (#295) ────────────────────────────────────────────────────
// Pure, deterministic: picks the single most roastable losing pick per player.
// Roastable kinds, most-severe first:
//   lost_allin     — an All-In (weight 'A') pick that lost
//   backfired_fade — a minority pick (faded the crowd) that lost
//   heavy_loss     — a High-weight ('H') pick that lost
// Low/Medium losses and any non-loss are not roastable. Opted-out players never roasted.

export type BadTakeCandidate = {
  user_id: string;
  display_name: string;
  weight: WeightCode;
  outcome: PickOutcome;
  is_minority: boolean;
};

const BAD_TAKE_SEVERITY: Record<BadTakeKind, number> = {
  lost_allin: 0,
  backfired_fade: 1,
  heavy_loss: 2
};

function classifyBadTake(c: BadTakeCandidate): BadTakeKind | null {
  if (c.outcome !== 'loss') return null;
  if (c.weight === 'A') return 'lost_allin';
  if (c.is_minority) return 'backfired_fade';
  if (c.weight === 'H') return 'heavy_loss';
  return null;
}

export function selectBadTakes(
  candidates: BadTakeCandidate[],
  optedOutUserIds: Iterable<string> = []
): RecapBadTake[] {
  const optedOut = new Set(optedOutUserIds);
  const bestByUser = new Map<string, RecapBadTake>();
  for (const c of candidates) {
    if (optedOut.has(c.user_id)) continue;
    const kind = classifyBadTake(c);
    if (!kind) continue;
    const existing = bestByUser.get(c.user_id);
    if (!existing || BAD_TAKE_SEVERITY[kind] < BAD_TAKE_SEVERITY[existing.kind]) {
      bestByUser.set(c.user_id, { user_id: c.user_id, display_name: c.display_name, kind });
    }
  }
  return [...bestByUser.values()].sort(
    (a, b) =>
      BAD_TAKE_SEVERITY[a.kind] - BAD_TAKE_SEVERITY[b.kind] ||
      a.display_name.localeCompare(b.display_name) ||
      a.user_id.localeCompare(b.user_id)
  );
}

// ── Rivalry selector (#295) ─────────────────────────────────────────────────────
// Pure, deterministic ranking of lifetime head-to-head pairs (#280). Each matchup
// appears twice in the read-model (one row per perspective); we keep the canonical
// direction (user_id < opponent_user_id). Intensity rewards volume and closeness:
// score = games − |a_wins − b_wins|. Opt-out is applied by the caller.

export type RivalryRow = {
  user_id: string;
  display_name: string;
  opponent_user_id: string;
  opponent_display_name: string;
  wins: number;
  losses: number;
  pushes: number;
  games_compared: number;
};

const MIN_RIVALRY_GAMES = 6;

function rivalryIntensity(r: RecapRivalry): number {
  return r.games - Math.abs(r.a_wins - r.b_wins);
}

export function selectTopRivalries(rows: RivalryRow[], limit = 1): RecapRivalry[] {
  const pairs: RecapRivalry[] = [];
  for (const r of rows) {
    if (r.user_id >= r.opponent_user_id) continue; // canonical direction only
    if (r.games_compared < MIN_RIVALRY_GAMES) continue;
    pairs.push({
      player_a: { user_id: r.user_id, display_name: r.display_name },
      player_b: { user_id: r.opponent_user_id, display_name: r.opponent_display_name },
      a_wins: r.wins,
      b_wins: r.losses, // A's losses are B's wins
      pushes: r.pushes,
      games: r.games_compared
    });
  }
  pairs.sort(
    (x, y) =>
      rivalryIntensity(y) - rivalryIntensity(x) ||
      y.games - x.games ||
      x.player_a.display_name.localeCompare(y.player_a.display_name) ||
      x.player_a.user_id.localeCompare(y.player_a.user_id)
  );
  return pairs.slice(0, limit);
}

export async function buildRecapFacts(params: {
  groupId: string;
  weekId: number;
}): Promise<RecapFacts & { _badge_snapshot: BadgeSnapshot }> {
  const { groupId, weekId } = params;

  const [weekMeta, groupMeta] = await Promise.all([loadWeekMeta(weekId), loadGroupMeta(groupId)]);
  const { weekNumber, seasonYear, isFinalWeek } = weekMeta;

  // Load stats for badge computation and trend data in parallel.
  const [seasonStats, seasonTotals] = await Promise.all([
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  // Week leader / laggard from stats_season_trend.
  const weekRows = seasonStats.trend.filter((r) => r.week_number === weekNumber);
  const sorted = [...weekRows].sort((a, b) => b.week_points - a.week_points);
  const weekLeader = sorted[0]
    ? {
        user_id: sorted[0].user_id,
        display_name: sorted[0].display_name,
        points: sorted[0].week_points
      }
    : null;
  const weekLaggardRaw = sorted[sorted.length - 1];
  const weekLaggard =
    weekLaggardRaw && weekLaggardRaw !== sorted[0]
      ? {
          user_id: weekLaggardRaw.user_id,
          display_name: weekLaggardRaw.display_name,
          points: weekLaggardRaw.week_points
        }
      : null;

  // Perfect weeks: wins > 0, no losses/pushes/missed.
  const perfectWeeks = weekRows
    .filter(
      (r) => r.week_wins > 0 && r.week_losses === 0 && r.week_pushes === 0 && r.week_missed === 0
    )
    .map((r) => ({ user_id: r.user_id, display_name: r.display_name }));

  // Season standings (top 5).
  const standings = seasonTotals.slice(0, 5).map((t) => ({
    user_id: t.user_id,
    display_name: t.display_name,
    rank: t.rank,
    total_points: t.total_points
  }));

  // Settled picks for this week's games (all weights). Powers both the All-in
  // hero/zero facts and the bad-take selector (#295).
  const { data: weekGames } = await supabaseService
    .from('games')
    .select('id')
    .eq('week_id', weekId);
  const gameIds = (weekGames ?? []).map((g) => g.id);

  // Get display names from seasonTotals (already loaded).
  const displayNameMap = new Map(seasonTotals.map((t) => [t.user_id, t.display_name]));

  type SettlementRow = {
    user_id: string;
    game_id: string;
    outcome: PickOutcome;
    weight: WeightCode;
  };
  let settlementRows: SettlementRow[] = [];
  if (gameIds.length > 0) {
    const { data: settled, error: settledErr } = await supabaseService
      .from('pick_settlement')
      .select('user_id, game_id, outcome, picks!inner(group_id, weight)')
      .in('game_id', gameIds)
      .eq('picks.group_id', groupId);
    if (settledErr) throw settledErr;
    settlementRows = (settled ?? []).map((r) => ({
      user_id: r.user_id as string,
      game_id: r.game_id as string,
      outcome: r.outcome as PickOutcome,
      weight: (r.picks as { weight: WeightCode }).weight
    }));
  }

  const allinRows = settlementRows.filter((r) => r.weight === 'A');

  // All-in hero: first win; all-in zero: first loss.
  const allinWin = allinRows.find((r) => r.outcome === 'win');
  const allinLoss = allinRows.find((r) => r.outcome === 'loss');
  const allinHero = allinWin
    ? {
        user_id: allinWin.user_id,
        display_name: displayNameMap.get(allinWin.user_id) ?? allinWin.user_id
      }
    : null;
  const allinZero = allinLoss
    ? {
        user_id: allinLoss.user_id,
        display_name: displayNameMap.get(allinLoss.user_id) ?? allinLoss.user_id
      }
    : null;

  // Most contrarian hit: minority pick that won, lowest consensus_pct.
  type ConsensusRow = {
    user_id: string;
    display_name: string;
    consensus_pct: number;
    is_minority: boolean;
    graded_outcome: string;
    week_number: number;
  };
  const { data: consensusRows, error: consErr } = await supabaseService
    .from('group_pick_consensus')
    .select('user_id, display_name, consensus_pct, is_minority, graded_outcome, week_number')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber)
    .eq('is_minority', true)
    .eq('graded_outcome', 'win')
    .order('consensus_pct', { ascending: true })
    .limit(1);
  if (consErr) throw consErr;

  const contRow = (consensusRows ?? [])[0] as ConsensusRow | undefined;
  const contrarianHit = contRow
    ? {
        user_id: contRow.user_id,
        display_name: contRow.display_name,
        consensus_pct: Number(contRow.consensus_pct)
      }
    : null;

  // Bad takes (#295): flag this week's minority picks so the selector can mark
  // backfired fades, then build per-pick candidates from the settled rows.
  const { data: minorityRows, error: minErr } = await supabaseService
    .from('group_pick_consensus')
    .select('user_id, game_id')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber)
    .eq('is_minority', true);
  if (minErr) throw minErr;
  const minoritySet = new Set(
    (minorityRows ?? []).map((r) => `${r.user_id as string}:${r.game_id as string}`)
  );

  const badTakeCandidates: BadTakeCandidate[] = settlementRows.map((r) => ({
    user_id: r.user_id,
    display_name: displayNameMap.get(r.user_id) ?? r.user_id,
    weight: r.weight,
    outcome: r.outcome,
    is_minority: minoritySet.has(`${r.user_id}:${r.game_id}`)
  }));
  // Top 4 keeps the roast focused without enumerating an entire bad week.
  const badTakes = selectBadTakes(badTakeCandidates, groupMeta.optedOutUserIds).slice(0, 4);

  // Rivalry facts (#295): rank lifetime head-to-head pairs (#280).
  const { data: h2hRows, error: h2hErr } = await supabaseService
    .from('stats_head_to_head_alltime')
    .select(
      'user_id, display_name, opponent_user_id, opponent_display_name, wins, losses, pushes, games_compared'
    )
    .eq('group_id', groupId);
  if (h2hErr) throw h2hErr;
  const rivalryRows: RivalryRow[] = (h2hRows ?? []).flatMap((r) => {
    if (
      !r.user_id ||
      !r.opponent_user_id ||
      r.display_name == null ||
      r.opponent_display_name == null
    ) {
      return [];
    }
    return [
      {
        user_id: r.user_id,
        display_name: r.display_name,
        opponent_user_id: r.opponent_user_id,
        opponent_display_name: r.opponent_display_name,
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        pushes: r.pushes ?? 0,
        games_compared: r.games_compared ?? 0
      }
    ];
  });
  const topRivalries = selectTopRivalries(rivalryRows, 2);

  // Badges: compute current state, diff against prior week's snapshot.
  const badges = computeBadges(badgeInputsFromSeasonStats(seasonStats, seasonTotals));
  const currentSnapshot = snapshotBadges(badges);

  // Load prior week's facts to get prior badge snapshot.
  const priorWeekNumber = weekNumber - 1;
  let badgeChanges: RecapFacts['badge_changes'] = [];
  if (priorWeekNumber >= 1) {
    const priorRecap = await getRecapForWeek(groupId, seasonYear, priorWeekNumber);
    const priorFacts = priorRecap?.facts as
      | (RecapFacts & { _badge_snapshot?: BadgeSnapshot })
      | null;
    if (priorFacts?._badge_snapshot) {
      badgeChanges = diffBadges(badges, priorFacts._badge_snapshot);
    }
    // If no prior recap (first covered week), badge_changes stays empty — no deltas.
  }

  // Apply opt-out: replace opted-out user display names with 'a player' in sensitive fields.
  const optedOutSet = new Set(groupMeta.optedOutUserIds);

  function neutralize<T extends { user_id: string; display_name: string }>(
    player: T | null
  ): T | null {
    if (!player) return null;
    if (optedOutSet.has(player.user_id)) return { ...player, display_name: 'a player' };
    return player;
  }

  // Rivalries: neutralize opted-out names; drop a pair only if BOTH sides opted out
  // (a "a player vs a player" rivalry carries no signal).
  const rivalries: RecapRivalry[] = topRivalries.flatMap((r) => {
    if (optedOutSet.has(r.player_a.user_id) && optedOutSet.has(r.player_b.user_id)) return [];
    return [{ ...r, player_a: neutralize(r.player_a)!, player_b: neutralize(r.player_b)! }];
  });

  return {
    group_id: groupId,
    group_name: groupMeta.name,
    season_year: seasonYear,
    week_number: weekNumber,
    is_final_week: isFinalWeek,
    spice: groupMeta.spice,
    opted_out_user_ids: groupMeta.optedOutUserIds,
    week_leader: neutralize(weekLeader),
    week_laggard: neutralize(weekLaggard),
    perfect_weeks: perfectWeeks.map((p) => neutralize(p)!),
    allin_hero: neutralize(allinHero),
    allin_zero: neutralize(allinZero),
    contrarian_hit: neutralize(contrarianHit),
    standings,
    badge_changes: badgeChanges,
    bad_takes: badTakes,
    rivalries,
    _badge_snapshot: currentSnapshot
  };
}
