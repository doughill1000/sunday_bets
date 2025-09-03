// src/lib/api/picks.ts
import type { TeamSide, WeightCode } from '$lib/types/domain';

export async function lockPick(gameId: string, team: TeamSide, weight: WeightCode) {
  const res = await fetch(`/api/picks/${gameId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ team, weight })
  });

  if (!res.ok) {
    const reason = await res.text().catch(() => 'request failed');
    return { ok: false, reason } as { ok: false; reason: string };
  }

  return (await res.json()) as {
    ok: boolean;
    reason?: string;
    final_locked_at?: string;
    relock_used?: boolean;
  };
}
