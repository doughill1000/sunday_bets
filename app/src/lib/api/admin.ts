// src/lib/api/admin.ts
export async function gradeWeek(week_id: number) {
  const res = await fetch('/api/admin/grade-week', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ week_id })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true; week_id: number }>;
}

export async function gradeGame(game_id: string) {
  const res = await fetch('/api/admin/grade-game', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ game_id })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true; game_id: string }>;
}

export async function gradeSeason(season_id: number) {
  const res = await fetch('/api/admin/grade-season', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ season_id })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true; season_id: number }>;
}
