// AI voice call: Vercel AI Gateway (ADR-0008, boundary 1).
// Metered, capped at $0.05/group/week. Failures yield deterministic fallback copy.
// Also hosts the Season Wrapped voice (#347): same gateway/cost path, season packets.
import { env } from '$env/dynamic/private';
import type { RecapFacts, SpiceLevel, BadTakeKind } from '$lib/types/server/recap';
import type { SeasonWrappedSubject } from '$lib/types/server/seasonWrapped';
import { renderSeasonFallback } from '$lib/server/recap/seasonFacts';

const MODEL = 'openai/gpt-5.4';
const MAX_TOKENS = 500;
const TIMEOUT_MS = 20_000;

// Cost estimates for openai/gpt-5.4 from #189 spike (~$0.006/run at 540in/310out).
const COST_PER_INPUT_TOKEN = 1.0 / 1_000_000; // $1/1M
const COST_PER_OUTPUT_TOKEN = 3.0 / 1_000_000; // $3/1M
const MAX_COST_USD = 0.05;

// Season Wrapped (#347) generates (players + 1) blurbs per group per season. This aggregate
// per-group/season budget caps that batch; the orchestrator accumulates spend against it and
// serves the deterministic fallback once exceeded. ~$0.50 ≈ 80 blurbs at the measured
// ~$0.006/run, so a 30-player group (~$0.18) clears it comfortably.
export const SEASON_MAX_COST_USD = 0.5;

/** Estimated USD cost of one gateway call from its token usage. */
export function estimateCostUsd(
  promptTokens: number | null,
  completionTokens: number | null
): number {
  return (
    (promptTokens ?? 0) * COST_PER_INPUT_TOKEN + (completionTokens ?? 0) * COST_PER_OUTPUT_TOKEN
  );
}

function spiceInstruction(spice: SpiceLevel): string {
  switch (spice) {
    case 'mild':
      return 'Keep the tone warm and encouraging — light ribbing only, no edge.';
    case 'spicy':
      return 'Go all in: harder roasts, bravado, and sharp commentary. Stay fact-faithful.';
    default:
      return 'Playful trash talk and hype — medium energy, keep it fun.';
  }
}

export type VoiceResult = {
  prose: string;
  is_fallback: boolean;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
};

// Shared gateway call (ADR-0008, boundary 1). Builds the request, enforces the timeout and
// the per-call cost guard, and routes any failure / over-budget to the caller's deterministic
// fallback. Weekly recap and Season Wrapped both flow through here so the network, metering,
// and cost-cap logic live in exactly one place.
async function callGateway(
  systemPrompt: string,
  packet: Record<string, unknown>,
  fallback: () => string
): Promise<VoiceResult> {
  const gatewayUrl = env.AI_GATEWAY_URL;
  const gatewayToken = env.AI_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    return {
      prose: fallback(),
      is_fallback: true,
      model: null,
      prompt_tokens: null,
      completion_tokens: null
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(packet) }
          ],
          max_tokens: MAX_TOKENS
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Gateway responded ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const prose = data.choices?.[0]?.message?.content?.trim() ?? '';
    const promptTokens = data.usage?.prompt_tokens ?? null;
    const completionTokens = data.usage?.completion_tokens ?? null;

    if (!prose) throw new Error('empty response from gateway');

    // Per-call cost guard: serve fallback if a single call exceeded the per-call cap.
    if (estimateCostUsd(promptTokens, completionTokens) > MAX_COST_USD) {
      return {
        prose: fallback(),
        is_fallback: true,
        model: MODEL,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      };
    }

    return {
      prose,
      is_fallback: false,
      model: MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens
    };
  } catch {
    return {
      prose: fallback(),
      is_fallback: true,
      model: MODEL,
      prompt_tokens: null,
      completion_tokens: null
    };
  }
}

// ── Weekly recap voice ──────────────────────────────────────────────────────────────

function buildSystemPrompt(spice: SpiceLevel, isFinalWeek: boolean): string {
  const tone = spiceInstruction(spice);
  const finalNote = isFinalWeek
    ? ' This is the FINAL week of the regular season — do NOT mention "next week", "playoffs", or future games.'
    : '';
  return [
    "You are the Sunday Bets AI League Commentator. Your job is to narrate the week's results",
    'in a short, punchy paragraph (3-5 sentences) for a sports betting group chat.',
    tone,
    'Rules: output ONLY the prose recap — no headers, no lists, no preamble.',
    'Use only the facts provided. Never invent outcomes, scores, or player actions.',
    'bad_takes lists the week\'s roastable blunders: kind "lost_allin" = a busted All-In bet,',
    '"backfired_fade" = went against the crowd and lost, "heavy_loss" = a heavy pick that flopped.',
    'rivalries lists ongoing all-time head-to-head matchups (a_wins vs b_wins) you may reference for flavor.',
    'Opted-out players (listed in opted_out_user_ids) are narrated neutrally — no roasting,',
    'even if they appear in bad_takes or rivalries.',
    isFinalWeek ? finalNote : ''
  ]
    .filter(Boolean)
    .join(' ');
}

// Roastable-fact allowlist (ADR-0008): only these gameplay-fact keys may enter the
// model packet. Anything else — raw user ids, emails, off-topic data — is stripped
// before the call as defense-in-depth for the deterministic/voice boundary.
export const ROASTABLE_FACT_KEYS = [
  'group',
  'week',
  'season',
  'is_final_week',
  'opted_out_user_ids',
  'week_leader',
  'week_laggard',
  'perfect_weeks',
  'allin_hero',
  'allin_zero',
  'contrarian_hit',
  'standings',
  'badge_changes',
  'bad_takes',
  'rivalries'
] as const;

/** Strip any key not on the roastable-fact allowlist. */
export function applyRoastableAllowlist(packet: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set<string>(ROASTABLE_FACT_KEYS);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(packet)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

/** Build the input packet the model receives (only allowlisted gameplay facts). */
export function buildInputPacket(facts: RecapFacts): Record<string, unknown> {
  return applyRoastableAllowlist({
    group: facts.group_name,
    week: facts.week_number,
    season: facts.season_year,
    is_final_week: facts.is_final_week,
    opted_out_user_ids: facts.opted_out_user_ids,
    week_leader: facts.week_leader,
    week_laggard: facts.week_laggard,
    perfect_weeks: facts.perfect_weeks,
    allin_hero: facts.allin_hero,
    allin_zero: facts.allin_zero,
    contrarian_hit: facts.contrarian_hit
      ? {
          display_name: facts.contrarian_hit.display_name,
          consensus_pct: facts.contrarian_hit.consensus_pct
        }
      : null,
    standings: facts.standings.map((s) => ({
      rank: s.rank,
      display_name: s.display_name,
      total_points: s.total_points
    })),
    badge_changes: facts.badge_changes,
    // Display names only — never user_id (ADR-0008, no PII).
    bad_takes: facts.bad_takes.map((b) => ({ display_name: b.display_name, kind: b.kind })),
    rivalries: facts.rivalries.map((r) => ({
      player_a: r.player_a.display_name,
      player_b: r.player_b.display_name,
      a_wins: r.a_wins,
      b_wins: r.b_wins,
      pushes: r.pushes,
      games: r.games
    }))
  });
}

function badTakeLine(displayName: string, kind: BadTakeKind): string {
  switch (kind) {
    case 'lost_allin':
      return `${displayName}'s All-In bet blew up.`;
    case 'backfired_fade':
      return `${displayName} faded the crowd and paid for it.`;
    case 'heavy_loss':
      return `${displayName} leaned heavy on a pick that flopped.`;
  }
}

/** Deterministic fallback copy when the AI call fails or exceeds budget. */
export function renderFallback(facts: RecapFacts): string {
  const leader = facts.week_leader?.display_name ?? 'Someone';
  const lines: string[] = [
    `Week ${facts.week_number} results are in for ${facts.group_name}.`,
    `${leader} led the week${facts.week_leader ? ` with ${facts.week_leader.points} points` : ''}.`
  ];
  if (facts.perfect_weeks.length > 0) {
    const names = facts.perfect_weeks.map((p) => p.display_name).join(' and ');
    lines.push(`${names} had a perfect week — respect.`);
  }
  // Prefer the most-severe bad take (selector already ordered them); fall back to
  // the legacy all-in-zero line only when no bad take qualified.
  const topBadTake = facts.bad_takes[0];
  if (topBadTake) {
    lines.push(badTakeLine(topBadTake.display_name, topBadTake.kind));
  } else if (facts.allin_zero) {
    lines.push(`${facts.allin_zero.display_name}'s all-in pick did not land this week.`);
  }
  const rivalry = facts.rivalries[0];
  if (rivalry) {
    lines.push(
      `The ${rivalry.player_a.display_name}–${rivalry.player_b.display_name} rivalry rolls on (${rivalry.a_wins}-${rivalry.b_wins} all-time).`
    );
  }
  if (facts.is_final_week) {
    lines.push('That wraps up the regular season. Final standings are set.');
  }
  return lines.join(' ');
}

export async function generateRecapProse(facts: RecapFacts): Promise<VoiceResult> {
  return callGateway(
    buildSystemPrompt(facts.spice, facts.is_final_week),
    buildInputPacket(facts),
    () => renderFallback(facts)
  );
}

// ── Season Wrapped voice (#347) ───────────────────────────────────────────────────────

// Season allowlist: gameplay-fact keys allowed into the season packet. Same defense-in-depth
// role as ROASTABLE_FACT_KEYS — display names only, never user_id (PII), at any nesting level
// (the packet builders below drop user_id explicitly).
export const SEASON_ROASTABLE_FACT_KEYS = [
  'scope',
  'group',
  'season',
  // player packet
  'rank',
  'total_points',
  'record',
  'best_week',
  'worst_week',
  'allin',
  'contrarian_wins',
  'contrarian_picks',
  'nemesis',
  'badges',
  'opted_out',
  // league packet
  'champion',
  'wooden_spoon',
  'standings',
  'title_badges',
  'player_count'
] as const;

/** Strip any key not on the season allowlist. */
export function applySeasonAllowlist(packet: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set<string>(SEASON_ROASTABLE_FACT_KEYS);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(packet)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

/** Build the season input packet the model receives (allowlisted facts, display names only). */
export function buildSeasonInputPacket(subject: SeasonWrappedSubject): Record<string, unknown> {
  if (subject.scope === 'league') {
    const f = subject.facts;
    return applySeasonAllowlist({
      scope: 'league',
      group: subject.group_name,
      season: subject.season_year,
      champion: f.champion,
      wooden_spoon: f.wooden_spoon,
      standings: f.standings.map((s) => ({
        rank: s.rank,
        display_name: s.display_name,
        total_points: s.total_points
      })),
      title_badges: f.title_badges,
      player_count: f.player_count
    });
  }

  const f = subject.facts;
  return applySeasonAllowlist({
    scope: 'player',
    group: subject.group_name,
    season: subject.season_year,
    rank: f.rank,
    total_points: f.total_points,
    record: f.record,
    best_week: f.best_week,
    worst_week: f.worst_week,
    allin: f.allin,
    contrarian_wins: f.contrarian_wins,
    contrarian_picks: f.contrarian_picks,
    // Nemesis: opponent display name only (already opt-out neutralized upstream); never user_id.
    nemesis: f.nemesis
      ? {
          opponent: f.nemesis.opponent.display_name,
          wins: f.nemesis.wins,
          losses: f.nemesis.losses,
          pushes: f.nemesis.pushes,
          games: f.nemesis.games
        }
      : null,
    badges: f.badges.map((b) => b.label),
    opted_out: f.opted_out
  });
}

function buildSeasonSystemPrompt(subject: SeasonWrappedSubject): string {
  const tone = spiceInstruction(subject.spice);

  if (subject.scope === 'league') {
    return [
      'You are the Sunday Bets AI League Commentator writing the LEAGUE\'s end-of-season "Wrapped".',
      "Narrate the season's story in a short, punchy paragraph (3-5 sentences) for a sports betting group chat.",
      tone,
      'Rules: output ONLY the prose recap — no headers, no lists, no preamble.',
      'Use only the facts provided. Never invent outcomes, scores, or player actions.',
      'The regular season is OVER — do NOT mention "next week", "playoffs", or future games.',
      'Any player shown as "a player" has opted out of being named — keep them neutral, never single them out.'
    ].join(' ');
  }

  const optOutNote = subject.facts.opted_out
    ? ' This player opted out of roasting — keep their recap warm and neutral, no jokes at their expense.'
    : '';
  return [
    'You are the Sunday Bets AI League Commentator writing ONE player\'s end-of-season "Wrapped".',
    'Address the player directly in the SECOND PERSON ("you", "your") in a short, punchy paragraph (3-5 sentences) for a sports betting group chat.',
    tone,
    'Rules: output ONLY the prose recap — no headers, no lists, no preamble.',
    'Use only the facts provided. Never invent outcomes, scores, or player actions.',
    'The regular season is OVER — do NOT mention "next week", "playoffs", or future games.',
    'Your nemesis is named by display name only; reference them for flavor.' + optOutNote
  ].join(' ');
}

export async function generateSeasonProse(subject: SeasonWrappedSubject): Promise<VoiceResult> {
  return callGateway(buildSeasonSystemPrompt(subject), buildSeasonInputPacket(subject), () =>
    renderSeasonFallback(subject)
  );
}
