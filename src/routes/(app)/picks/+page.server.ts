import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getGroupPicks } from '$lib/server/db/queries/getGroupPicks';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.locals.safeGetSession();
  const userId = session?.user.id ?? null;

  const week = await findActiveWeek();
  if (!week) return { week: null, games: [], picks: {}, groupPicks: [], userId };

  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (issue #102)
  const [games, picks, groupPicks] = await Promise.all([
    getActiveWeekGames(),
    getMyPicks(event, week.id, groupId),
    getGroupPicks(event, week.id, groupId)
  ]);

  return { week, games, picks, groupPicks, userId };
};
