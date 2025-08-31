// src/lib/server/games.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { WeightCode } from '../types/domain';
import type { GameDTO } from '$lib/types/ui';
import { findWeekById } from './db/queries/findWeekById';
import { listGamesWithActiveLine } from './db/queries/listGamesWithActiveLine';
import { findPicksForGames } from './db/queries/findPicksForGames';

/**
 * Fetch all games for a week with the active Fanduel line + visible picks.
 * Visibility rule: show all players’ picks once the game has started; before
 * kickoff show only the current user’s locked pick (others hidden).
 */
export async function listWeekGamesWithPicks(event: RequestEvent, weekId: number | string) {
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
  const gameIds = rows.map((r) => r.gameId);
  const allPicks = await findPicksForGames(gameIds);

  const now = new Date();

  // 5) Shape into DTO with visibility rules
  const data: GameDTO[] = rows.map((r) => {
    const kickoff = new Date(r.commenceTime);
    const started = kickoff <= now;

    const visible = allPicks
      .filter((p) => p.gameId === r.gameId)
      .filter((p) => started || p.userId === user.id)
      .map((p) => {
        // choose final locked if exists, else initial locked
        const lockedTeamId = p.finalLockedSpreadTeamId ?? p.initialLockedSpreadTeamId ?? null;
        const lockedAtRaw = p.finalLockedAt ?? p.initialLockedAt ?? null;

        // Map spread-team "id" (teams.id) straight through.
        const pickedTeamId = lockedTeamId ?? null;

        return {
          userId: p.userId,
          displayName: p.displayName,
          pickedTeamId,
          weight: (p.weight as WeightCode) ?? null,
          lockedAt: lockedAtRaw ? new Date(lockedAtRaw).toISOString() : null,
          isMe: p.userId === user.id
        };
      });

    return {
      id: r.gameId,
      commenceTime: new Date(r.commenceTime).toISOString(),
      status: r.status,
      home: { id: r.homeTeamId, name: r.homeName, shortName: r.homeShort },
      away: { id: r.awayTeamId, name: r.awayName, shortName: r.awayShort },
      line: {
        spreadTeamId: r.spreadTeamId ?? null,
        spreadValue: r.spreadValue,
        fetchedAt: r.fetchedAt ? new Date(r.fetchedAt).toISOString() : null
      },
      started,
      picks: visible
    };
  });

  return data;
}
