// AI voice call: Vercel AI Gateway (ADR-0008, boundary 1).
// Metered, capped at $0.05/group/week. Failures yield deterministic fallback copy.
import { env } from '$env/dynamic/private';
import type { RecapFacts, SpiceLevel } from '$lib/types/server/recap';

const MODEL = 'openai/gpt-5.4';
const MAX_TOKENS = 500;
const TIMEOUT_MS = 20_000;

// Cost estimates for openai/gpt-5.4 from #189 spike (~$0.006/run at 540in/310out).
const COST_PER_INPUT_TOKEN = 1.0 / 1_000_000; // $1/1M
const COST_PER_OUTPUT_TOKEN = 3.0 / 1_000_000; // $3/1M
const MAX_COST_USD = 0.05;

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
    'Opted-out players (listed in opted_out_user_ids) are narrated neutrally — no roasting.',
    isFinalWeek ? finalNote : ''
  ]
    .filter(Boolean)
    .join(' ');
}

/** Build the input packet the model receives (only allowlisted gameplay facts). */
function buildInputPacket(facts: RecapFacts): object {
  return {
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
    badge_changes: facts.badge_changes
  };
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
  if (facts.allin_zero) {
    lines.push(`${facts.allin_zero.display_name}'s all-in pick did not land this week.`);
  }
  if (facts.is_final_week) {
    lines.push('That wraps up the regular season. Final standings are set.');
  }
  return lines.join(' ');
}

export type VoiceResult = {
  prose: string;
  is_fallback: boolean;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
};

export async function generateRecapProse(facts: RecapFacts): Promise<VoiceResult> {
  const gatewayUrl = env.AI_GATEWAY_URL;
  const gatewayToken = env.AI_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    return {
      prose: renderFallback(facts),
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
            { role: 'system', content: buildSystemPrompt(facts.spice, facts.is_final_week) },
            { role: 'user', content: JSON.stringify(buildInputPacket(facts)) }
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

    // Cost guard: if this call exceeded the per-group/week cap, serve fallback copy.
    const estimatedCost =
      (promptTokens ?? 0) * COST_PER_INPUT_TOKEN + (completionTokens ?? 0) * COST_PER_OUTPUT_TOKEN;
    if (estimatedCost > MAX_COST_USD) {
      return {
        prose: renderFallback(facts),
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
      prose: renderFallback(facts),
      is_fallback: true,
      model: MODEL,
      prompt_tokens: null,
      completion_tokens: null
    };
  }
}
