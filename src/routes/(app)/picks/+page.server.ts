import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

export const load: PageServerLoad = async (event) => {
  const week = await findActiveWeek();
  if (!week) return { week: null, games: [], picks: {} };

  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (issue #102)
  const [games, picks] = await Promise.all([
    getActiveWeekGames(),
    getMyPicks(event, week.id, groupId)
  ]);

  return { week, games, picks };
};
