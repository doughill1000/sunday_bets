import type { UIGame } from '$lib/types/ui';
import type { PageLoad } from './$types';
import type { ServerGame } from '$lib/types/server';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('api/games', { cache: 'no-store' });

  if (!res.ok) {
    return { games: [] as UIGame[] };
  }

  const data: { games: ServerGame[] } = await res.json();

  const mapped: UIGame[] = data.games.map((g) => {
    const spreadTeam = g.spread_team === 'away' ? 'away' : 'home'; // defensive default

    return {
      id: g.game_id,
      kickoff: g.kickoff,
      away: g.away_code, // e.g., "BUF"
      home: g.home_code, // e.g., "NYJ"
      spreadTeam,
      spread: Number(g.spread_value ?? 0),
    };
  });

  return { games: mapped };
};
