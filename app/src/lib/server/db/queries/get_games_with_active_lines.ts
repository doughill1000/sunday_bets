import { dbClient } from '$lib/server/db/dbClient'; // adjust import to your db instance
import { games, teams, gameLines } from '../../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function getGamesWithActiveLines(weekId: number) {
  return dbClient
    .select({
      game_id: games.id,
      external_game_id: games.externalGameId,
      kickoff: games.commenceTime,
      home_code: teams.shortName,
      home_name: teams.name,
      away_code: teams.shortName,
      away_name: teams.name,
      spread_team: sql`CASE WHEN game_lines.spread_team_id = games.home_team_id THEN 'home' ELSE 'away' END`,
      spread_value: gameLines.spreadValue,
      line_source: gameLines.source
    })
    .from(games)
    .innerJoin(teams, eq(teams.id, games.homeTeamId))
    .innerJoin(teams, eq(teams.id, games.awayTeamId))
    .innerJoin(gameLines, and(eq(gameLines.gameId, games.id), eq(gameLines.isActiveLine, true)))
    .where(eq(games.weekId, weekId))
    .orderBy(games.commenceTime);
}
