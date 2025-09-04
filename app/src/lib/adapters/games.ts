// $lib/adapters/games.ts
import type { DbGameRow } from '$lib/types/server';
import type { UIGame } from '$lib/types/ui';

export function toUIGamesFromDb(rows: DbGameRow[]): UIGame[] {
  return (rows ?? []).map((r) => ({
    id: r.game_id,
    kickoff: r.kickoff,
    away: r.away_code,
    home: r.home_code,
    spreadTeam: r.spread_team ?? 'home',
    spread: String(r.spread_value ?? '')
  }));
}
