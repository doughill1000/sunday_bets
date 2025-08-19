// src/lib/server/games.ts
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
  games,
  weeks,
  teams,
  gameLines,
  picks,
  users
} from '../../db/schema'
import { and, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { WeightCode } from '../types/domain';

export type GameDTO = {
  id: string;                           // games.id (uuid)
  commenceTime: string;                 // ISO
  status: string;
  home: { id: number; name: string; shortName: string }; // teams are bigserial -> number
  away: { id: number; name: string; shortName: string };
  line: {
    spreadTeamId: number | null;        // teams.id (bigint -> number)
    spreadValue: string | null;
    fetchedAt: string | null;
  };
  started: boolean;
  picks: Array<{
    userId: string;                     // users.id (uuid)
    displayName: string;
    pickedTeamId: number | null;        // teams.id
    weight: WeightCode | null;
    lockedAt: string | null;
    isMe: boolean;
  }>;
};

/**
 * Fetch all games for a week with the active Fanduel line + visible picks.
 * Visibility rule: show all players’ picks once the game has started; before
 * kickoff show only the current user’s locked pick (others hidden).
 */
export async function listWeekGamesWithPicks(event: RequestEvent, weekId: number | string) {
  // 1) Auth (from new SSR setup). RLS-aware routes should have a user.
  const { data: { user }, error: authErr } = await event.locals.supabase.auth.getUser();
  if (authErr) throw new Error('Auth check failed');
  if (!user)   throw new Error('Not authenticated');

  // 2) Verify week exists (optional guard)
  const weekRow = await db.query.weeks.findFirst({ where: eq(weeks.id, Number(weekId)) });
  if (!weekRow) throw new Error('Week not found');

  // 3) Query games + active Fanduel line + teams (one shot)
  const away = alias(teams, 'away_team');
  const home = alias(teams, 'home_team');

  const rows = await db
    .select({
      gameId: games.id,
      commenceTime: games.commenceTime,      // timestamptz (mode: 'string')
      status: games.status,
      homeTeamId: games.homeTeamId,          // bigint -> number
      awayTeamId: games.awayTeamId,          // bigint -> number
      homeName: home.name,
      homeShort: home.shortName,
      awayName: away.name,
      awayShort: away.shortName,
      spreadTeamId: gameLines.spreadTeamId,  // bigint -> number | null
      spreadValue: gameLines.spreadValue,    // number | null  (ensure $type<number>() in schema)
      fetchedAt: gameLines.fetchedAt         // string | null
    })
    .from(games)
    .innerJoin(weeks, eq(weeks.id, games.weekId))
    .innerJoin(home, eq(home.id, games.homeTeamId))
    .innerJoin(away, eq(away.id, games.awayTeamId))
    .leftJoin(
      gameLines,
      and(
        eq(gameLines.gameId, games.id),
        eq(gameLines.isActiveLine, true),
        eq(gameLines.source, 'fanduel')
      )
    )
    .where(eq(games.weekId, Number(weekId)))
    .orderBy(games.commenceTime);

  // 4) Fetch picks for those games
  const gameIds = rows.map(r => r.gameId);
  const allPicks = gameIds.length
    ? await db
        .select({
          gameId: picks.gameId,
          userId: picks.userId,
          displayName: users.displayName,
          // In your current schema you store *locked* state, not "selected":
          // choose finalLocked... if present, else initialLocked... as the current locked state
          finalLockedAt: picks.finalLockedAt,
          initialLockedAt: picks.initialLockedAt,
          finalLockedSpreadTeamId: picks.finalLockedSpreadTeamId,
          initialLockedSpreadTeamId: picks.initialLockedSpreadTeamId,
          finalLockedSpreadValue: picks.finalLockedSpreadValue,
          initialLockedSpreadValue: picks.initialLockedSpreadValue,
          weight: picks.weight
        })
        .from(picks)
        .innerJoin(users, eq(users.id, picks.userId))
        .where(inArray(picks.gameId, gameIds))
    : [];

  const now = new Date();

  // 5) Shape into DTO with visibility rules
  const data: GameDTO[] = rows.map((r) => {
    const kickoff = new Date(r.commenceTime);
    const started = kickoff <= now;

    const visible = allPicks
      .filter(p => p.gameId === r.gameId)
      .filter(p => started || p.userId === user.id)
      .map(p => {
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
