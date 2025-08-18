import type { RequestHandler } from '../weeks/[weekId]/games/$types';
import { json, error } from '@sveltejs/kit';
import { supabaseSSR } from '$lib/supabase/ssr';
import { db } from '$lib/db'; // your Drizzle instance
import { games, weeks, teams, gameLines, picks, users } from '../../../db/drizzle/schema';
import { and, eq, sql, or, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

type WeightCode = 'L' | 'M' | 'H' | 'A';

type GameDTO = {
  id: string;
  commenceTime: string; // ISO
  status: string;
  home: { id: string; name: string; shortName: string };
  away: { id: string; name: string; shortName: string };
  line: {
    spreadTeamId: string | null;
    spreadValue: number | null;
    fetchedAt: string | null;
  };
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

export const GET: RequestHandler = async ({ request, cookies, locals, params, url }) => {
  const supabase = supabaseSSR(cookies);

  const {
    data: { session },
    error: sessErr
  } = await supabase.auth.getSession();

  if (sessErr) throw error(500, 'Auth check failed');
  if (!session) throw error(401, 'Not authenticated');

  const me = session.user;

  const weekId = params.weekId;
  if (!weekId) throw error(400, 'weekId required');

  // Ensure the week exists and is part of the active season (optional)
  const weekRow = await db.query.weeks.findFirst({
    where: eq(weeks.id, weekId)
  });
  if (!weekRow) throw error(404, 'Week not found');

  const away = alias(teams, 'away_team');
  const homeName = alias(teams, 'homeName');
  const homeShort = alias(teams, 'homeShort');

  // Grab games + latest active line (Barstool policy) + teams
  // Latest active line per game from Barstool (or your chosen source)
  const rows = await db
    .select({
      gameId: games.id,
      commenceTime: games.commenceTime,
      status: games.status,
      homeTeamId: games.homeTeamId,
      awayTeamId: games.awayTeamId,
      homeName: homeName,
      homeShort: homeShort,
      awayName: sql<string>`away_team.name`,
      awayShort: sql<string>`away_team.short_name`,
      spreadTeamId: gameLines.spreadTeamId,
      spreadValue: gameLines.spreadValue,
      fetchedAt: gameLines.fetchedAt
    })
    .from(games)
    .innerJoin(weeks, eq(weeks.id, games.weekId))
    .innerJoin(teams, eq(teams.id, games.homeTeamId))
    .innerJoin(away, eq(sql`away_team.id`, games.awayTeamId))
    .leftJoin(
      gameLines,
      and(
        eq(gameLines.gameId, games.id),
        eq(gameLines.isActiveLine, true),
        eq(gameLines.source, 'barstool')
      )
    )
    .where(eq(games.weekId, weekId))
    .orderBy(games.commenceTime);

  // Get all picks for this week (we’ll filter by visibility below)
  const gameIds = rows.map((r) => r.gameId);
  const allPicks = gameIds.length
    ? await db
        .select({
          gameId: picks.gameId,
          userId: picks.userId,
          displayName: users.displayName,
          lockedTeam: picks.lockedTeam,
          lockedWeight: picks.lockedWeight,
          lockedAt: picks.lockedAt,
          selectedTeam: picks.selectedTeam,
          selectedWeight: picks.selectedWeight
        })
        .from(picks)
        .innerJoin(users, eq(users.id, picks.userId))
        .where(inArray(picks.gameId, gameIds))
    : [];

  const nowISO = new Date().toISOString();

  const data: GameDTO[] = rows.map((r) => {
    const started = new Date(r.commenceTime) <= new Date(nowISO);

    const visiblePicks = allPicks
      .filter((p) => p.gameId === r.gameId)
      .filter((p) => started || p.userId === me.id)
      .map((p) => {
        const teamSide = p.lockedTeam ?? (p.userId === me.id ? p.selectedTeam : null);
        const pickedTeamId =
          teamSide === 'home' ? r.homeTeamId : teamSide === 'away' ? r.awayTeamId : null;

        const weight = (p.lockedWeight ??
          (p.userId === me.id ? p.selectedWeight : null)) as WeightCode | null;

        return {
          userId: p.userId,
          displayName: p.displayName,
          pickedTeamId,
          weight,
          lockedAt:  p.lockedAt?.toISOString() ?? null,
          isMe: p.userId === me.id
        };
      });

    return {
      id: r.gameId,
      commenceTime: r.commenceTime.toISOString(),
      status: r.status,
      home: { id: r.homeTeamId, name: r.homeName, shortName: r.homeShort },
      away: { id: r.awayTeamId, name: r.awayName, shortName: r.awayShort },
      line: {
        spreadTeamId: r.spreadTeamId ?? null,
        spreadValue: r.spreadValue ?? null,
        fetchedAt: r.fetchedAt ? r.fetchedAt.toISOString() : null
      },
      started,
      picks: visiblePicks
    };
  });

  return json({ weekId, games: data });
};
