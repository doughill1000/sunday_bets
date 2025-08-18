import type { PageLoad } from './$types';

type WeightCode = 'L' | 'M' | 'H' | 'A';

type ServerGame = {
  id: string;
  commenceTime: string;
  status: string;
  home: { id: string; name: string; shortName: string };
  away: { id: string; name: string; shortName: string };
  line: { spreadTeamId: string | null; spreadValue: number | null; fetchedAt: string | null };
  started: boolean;
  picks: Array<{
    userId: string;
    displayName: string;
    pickedTeamId: string | null;
    weight: WeightCode | null;
    lockedAt: string | null;
    isMe: boolean;
  }>;
};

export const load: PageLoad = async ({ fetch, params }) => {
  const res = await fetch(`api/games`, { cache: 'no-store' });
  if (!res.ok) {
    return { games: [] as any[] };
  }
  const { games } = await res.json() as { games: ServerGame[] };

  // Map to your existing UI's Game shape
  const mapped = games.map((g) => {
    // decide which side the spread is for, expressed as 'home' | 'away'
    const spreadTeam: 'home' | 'away' =
      g.line.spreadTeamId === g.home.id ? 'home'
      : g.line.spreadTeamId === g.away.id ? 'away'
      : 'home'; // default defensively

    return {
      id: g.id,
      kickoff: g.commenceTime,
      away: g.away.shortName,   // e.g. "BUF"
      home: g.home.shortName,   // e.g. "NYJ"
      spreadTeam,
      spread: g.line.spreadValue ?? 0
    };
  });

  return { games: mapped };
};