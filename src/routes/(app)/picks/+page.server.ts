import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getCommentsForGame } from '$lib/server/db/queries/getCommentsForGame';
import { getReactionsForGame } from '$lib/server/db/queries/getReactionsForGame';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

export const load: PageServerLoad = async (event) => {
  const week = await findActiveWeek();
  if (!week) return { week: null, games: [], picks: {}, social: {}, userId: null };

  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (issue #102)
  const userId = event.locals.user?.id ?? null;

  const [games, picks] = await Promise.all([
    getActiveWeekGames(),
    getMyPicks(event, week.id, groupId)
  ]);

  // Load comments and reactions for started games only (RLS also enforces this gate).
  const now = Date.now();
  const startedGameIds = games.filter((g) => new Date(g.kickoff).getTime() <= now).map((g) => g.id);

  const socialEntries = await Promise.all(
    startedGameIds.map(async (gameId) => {
      const [comments, reactions] = await Promise.all([
        getCommentsForGame(event, groupId, gameId),
        getReactionsForGame(event, groupId, gameId)
      ]);
      return [gameId, { comments, reactions }] as const;
    })
  );
  const social = Object.fromEntries(socialEntries);

  return { week, games, picks, social, userId };
};
