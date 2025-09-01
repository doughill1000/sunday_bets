// src/lib/api/picks.ts
export async function lockPick(gameId: string) {
  const res = await fetch(`/api/picks/${gameId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}) // or include relock flag if needed
  });
  return res.json() as Promise<{ ok: boolean; reason?: string; final_locked_at?: string; relock_used?: boolean }>;
}
