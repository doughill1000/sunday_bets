// src/lib/server/games.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { WeightCode } from '../../types/domain';
import type { GameDTO } from '$lib/types/ui';
import { findWeekById } from '../db/queries/findWeekById';
import { listGamesWithActiveLine } from '../db/queries/listGamesWithActiveLine';
import { findPicksForGames } from '../db/queries/findPicksForGames';

/**
 * Fetch all games for a week with the active Fanduel line + visible picks.
 * Visibility rule: show all players’ picks once the game has started; before
 * kickoff show only the current user’s locked pick (others hidden).
 */
export async function listWeekGamesWithPicks(event: RequestEvent, weekId: number) {
  // 1) Auth
  const {
    data: { user },
    error: authErr
  } = await event.locals.supabase.auth.getUser();
  if (authErr) throw new Error('Auth check failed');
  if (!user) throw new Error('Not authenticated');

  // 2) Verify week exists
  const weekRow = await findWeekById(weekId);
  if (!weekRow) throw new Error('Week not found');

  // 3) Query games + active Fanduel line + teams
  const rows = await listGamesWithActiveLine(weekId);

  // 4) Fetch picks for those games
  const gameIds = rows.map((r) => r.id);
  const allPicks = await findPicksForGames(gameIds);

  const now = new Date();

  // 5) Shape into DTO with visibility rules
  const data: GameDTO[] = rows.map((r) => {
    const kickoff = new Date(r.commence_time);
    const started = kickoff <= now;

    const visible = allPicks
      .filter((p) => p.game_id === r.id)
      .filter((p) => started || p.user_id === user.id)
      .map((p) => {
        const lockedAtRaw = p.locked_at ?? null;

        return {
          userId: p.user_id ?? '',
          displayName: p.picked_team_short ?? '',
          pickedTeamId: p.picked_team_id,
          weight: (p.weight as WeightCode) ?? null,
          lockedAt: lockedAtRaw ? new Date(lockedAtRaw).toISOString() : null,
          isMe: p.user_id === user.id
        };
      });

    // unwrap the single active line and pluck fields
    const line = Array.isArray(r.game_lines) ? r.game_lines[0] : r.game_lines;

    return {
      id: r.id,
      commenceTime: new Date(r.commence_time).toISOString(),
      status: r.status,
      home: { id: r.home_team.id, name: r.home_team.name, shortName: r.home_team.short_name },
      away: { id: r.away_team.id, name: r.away_team.name, shortName: r.away_team.short_name },
      line: {
        // if your GameDTO insists on non-null here, ensure your query always returns an active line
        spreadTeamId: line?.spread_team_id as number,
        spreadValue: line?.spread_value as number,
        source: line?.source as string,
        fetchedAt: line?.fetched_at ? new Date(line.fetched_at).toISOString() : null
      },
      started,
      picks: visible
    };
  });

  return data;
}
