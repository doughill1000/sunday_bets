// tests/integration/pagination.test.ts
//
// Verifies the bounded, keyset-paginated leaderboard and members reads (issue #152)
// against the local Supabase stack:
//   - every page is bounded to the requested size;
//   - paging walks the whole set in order with no overlap or gaps;
//   - the default page returns a small group in one page (existing output unchanged);
//   - keyset paging is STABLE under an insert above the cursor (no dup, no skip) --
//     the property offset pagination lacks;
//   - the group_id-leading keyset indexes are actually chosen by the planner (EXPLAIN).

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import postgres from 'postgres';
import { createServiceClient } from './_auth';
import { ensureTeams, ensureAuthUsers, deleteAuthUsers, ensureGroup } from './fixtures/db';
import {
  getSeasonLeaderboardPage,
  getAvailableSeasons
} from '../../src/lib/server/db/queries/leaderboard';
import { getGroupMembersPage } from '../../src/lib/server/db/queries/getGroupMembers';

const admin = createServiceClient();
const LOCAL_DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const GROUP_ID = '00000000-0000-4152-9000-000000000001';
const SEASON_YEAR = 2098; // far-future, collision-free

// 8 members: index 0 is the commissioner, 1..7 are members. points_delta = i + 1, so
// season totals are all distinct (1..8) and the leaderboard order is unambiguous.
const N = 8;
const MEMBER_IDS = Array.from(
  { length: N },
  (_, i) => `00000000-0000-0000-9000-${String(i + 1).padStart(12, '0')}`
);
// A late joiner inserted mid-test to prove keyset stability under inserts.
const LATE_JOINER_ID = '00000000-0000-0000-9000-000000000099';

let seedGameId: string;

async function refresh() {
  const { error } = await admin.rpc('refresh_leaderboard_stats');
  if (error) throw new Error('refresh_leaderboard_stats: ' + error.message);
}

beforeAll(async () => {
  const now = new Date().toISOString();

  await ensureAuthUsers(
    MEMBER_IDS.map((id, i) => ({
      id,
      email: `pgntest${i + 1}@example.com`,
      displayName: `PgnTest${i + 1}`
    }))
  );

  const { error: userErr } = await admin.from('users').upsert(
    MEMBER_IDS.map((id, i) => ({
      id,
      display_name: `PgnTest${i + 1}`,
      role: 'player' as const,
      created_at: now
    })),
    { onConflict: 'id' }
  );
  if (userErr) throw new Error('seed users: ' + userErr.message);

  await ensureGroup(admin, { id: GROUP_ID, name: 'Pagination Test Group' });

  // Distinct joined_at per member so the members-list order is deterministic; the
  // commissioner joins LAST in time but still sorts first by role.
  const { error: memErr } = await admin.from('group_memberships').upsert(
    MEMBER_IDS.map((user_id, i) => ({
      group_id: GROUP_ID,
      user_id,
      role: i === 0 ? ('commissioner' as const) : ('member' as const),
      joined_at: new Date(Date.UTC(2000 + i, 0, 1)).toISOString()
    })),
    { onConflict: 'group_id,user_id' }
  );
  if (memErr) throw new Error('seed memberships: ' + memErr.message);

  // Season + week + a final game.
  let seasonId: number;
  {
    const { data: existing } = await admin
      .from('seasons')
      .select('id')
      .eq('year', SEASON_YEAR)
      .maybeSingle();
    seasonId =
      existing?.id ??
      (await admin.from('seasons').insert({ year: SEASON_YEAR }).select('id').single()).data!.id;
  }
  let weekId: number;
  {
    const { data: existing } = await admin
      .from('weeks')
      .select('id')
      .eq('season_id', seasonId)
      .eq('week_number', 1)
      .maybeSingle();
    weekId =
      existing?.id ??
      (
        await admin
          .from('weeks')
          .insert({
            season_id: seasonId,
            week_number: 1,
            start_ts: `${SEASON_YEAR}-09-01T00:00:00Z`,
            end_ts: `${SEASON_YEAR}-09-08T00:00:00Z`
          })
          .select('id')
          .single()
      ).data!.id;
  }

  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  const homeId = teams!.find((t) => t.short_name === 'KC')!.id;
  const awayId = teams!.find((t) => t.short_name === 'BUF')!.id;

  const externalId = `pagination-test-${SEASON_YEAR}`;
  {
    const { data: existing } = await admin
      .from('games')
      .select('id')
      .eq('external_game_id', externalId)
      .maybeSingle();
    seedGameId =
      existing?.id ??
      (
        await admin
          .from('games')
          .insert({
            week_id: weekId,
            home_team_id: homeId,
            away_team_id: awayId,
            external_game_id: externalId,
            status: 'final',
            commence_time: `${SEASON_YEAR}-09-04T13:00:00Z`
          })
          .select('id')
          .single()
      ).data!.id;
  }

  // One settlement per member, points_delta = i + 1 → distinct totals 1..8.
  const { error: settlErr } = await admin.from('pick_settlement').upsert(
    MEMBER_IDS.map((user_id, i) => ({
      user_id,
      game_id: seedGameId,
      group_id: GROUP_ID,
      pick_id: null,
      outcome: 'win' as const,
      points_delta: i + 1,
      graded_at: now
    })),
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (settlErr) throw new Error('seed pick_settlement: ' + settlErr.message);

  await refresh();
});

afterAll(async () => {
  const allIds = [...MEMBER_IDS, LATE_JOINER_ID];
  await admin.from('pick_settlement').delete().eq('group_id', GROUP_ID).in('user_id', allIds);
  if (seedGameId) await admin.from('games').delete().eq('id', seedGameId);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
  await admin.from('group_memberships').delete().eq('group_id', GROUP_ID);
  await admin.from('groups').delete().eq('id', GROUP_ID);
  await admin.from('users').delete().in('id', allIds);
  await deleteAuthUsers(allIds);
});

describe('leaderboard keyset pagination', () => {
  it('default page returns the whole small group in one page (output unchanged)', async () => {
    const page = await getSeasonLeaderboardPage(SEASON_YEAR, GROUP_ID);
    expect(page.entries).toHaveLength(N);
    expect(page.nextCursor).toBeNull();
    // Ordered by total_points desc: 8,7,...,1.
    expect(page.entries.map((e) => e.total_points)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('walks every entry exactly once across bounded pages, in order', async () => {
    const seen: number[] = [];
    let cursor: string | null = null;
    let guard = 0;
    do {
      const page = await getSeasonLeaderboardPage(SEASON_YEAR, GROUP_ID, { limit: 3, cursor });
      expect(page.entries.length).toBeLessThanOrEqual(3);
      seen.push(...page.entries.map((e) => e.total_points));
      cursor = page.nextCursor;
    } while (cursor && ++guard < 20);

    expect(seen).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
    expect(new Set(seen).size).toBe(N); // no duplicates, no gaps
  });

  it('is stable under an insert above the cursor (no duplicate, no skip)', async () => {
    // Page 1 (limit 3): totals 8,7,6 — cursor now points just past total=6.
    const page1 = await getSeasonLeaderboardPage(SEASON_YEAR, GROUP_ID, { limit: 3 });
    expect(page1.entries.map((e) => e.total_points)).toEqual([8, 7, 6]);
    const cursor = page1.nextCursor;
    expect(cursor).not.toBeNull();

    // Insert a brand-new member whose total (10) sorts ABOVE the entire first page,
    // then refresh the matview.
    await ensureAuthUsers([
      { id: LATE_JOINER_ID, email: 'pgnlate@example.com', displayName: 'PgnLate' }
    ]);
    await admin
      .from('users')
      .upsert(
        { id: LATE_JOINER_ID, display_name: 'PgnLate', role: 'player' },
        { onConflict: 'id' }
      );
    await admin.from('group_memberships').upsert(
      {
        group_id: GROUP_ID,
        user_id: LATE_JOINER_ID,
        role: 'member',
        joined_at: new Date(Date.UTC(2099, 0, 1)).toISOString()
      },
      { onConflict: 'group_id,user_id' }
    );
    await admin.from('pick_settlement').upsert(
      {
        user_id: LATE_JOINER_ID,
        game_id: seedGameId,
        group_id: GROUP_ID,
        pick_id: null,
        outcome: 'win',
        points_delta: 10,
        graded_at: new Date().toISOString()
      },
      { onConflict: 'group_id,user_id,game_id' }
    );
    await refresh();

    // Page 2 from the original cursor: keyset keys on the VALUE (total=6), so the
    // insert above the cursor does not shift this page. We get 5,4,3 — never a repeat
    // of 8/7/6, and never a skip. (Offset pagination would have shifted and dup'd.)
    const page2 = await getSeasonLeaderboardPage(SEASON_YEAR, GROUP_ID, { limit: 3, cursor });
    expect(page2.entries.map((e) => e.total_points)).toEqual([5, 4, 3]);
  });
});

describe('members keyset pagination', () => {
  it('default page returns the whole small group, commissioner first', async () => {
    const page = await getGroupMembersPage(GROUP_ID);
    // 8 original members (the late joiner is added by the leaderboard suite; both
    // suites share this group, so assert on the deterministic head instead of count).
    expect(page.members.length).toBeGreaterThanOrEqual(N);
    expect(page.members[0].role).toBe('commissioner');
    // After the sole commissioner, members are ordered by joined_at ascending.
    const memberRows = page.members.filter((m) => m.role === 'member');
    const joinedTimes = memberRows.map((m) => Date.parse(m.joinedAt));
    expect(joinedTimes).toEqual([...joinedTimes].sort((a, b) => a - b));
  });

  it('walks every member exactly once across bounded pages', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let guard = 0;
    do {
      const page = await getGroupMembersPage(GROUP_ID, { limit: 3, cursor });
      expect(page.members.length).toBeLessThanOrEqual(3);
      seen.push(...page.members.map((m) => m.userId));
      cursor = page.nextCursor;
    } while (cursor && ++guard < 20);

    // Every seeded member appears exactly once.
    expect(new Set(seen).size).toBe(seen.length);
    for (const id of MEMBER_IDS) expect(seen).toContain(id);
  });
});

describe('available seasons', () => {
  it('returns the seeded season year (bounded distinct read)', async () => {
    const years = await getAvailableSeasons(GROUP_ID);
    expect(years).toContain(SEASON_YEAR);
  });
});

describe('EXPLAIN: keyset reads use the group_id-leading indexes', () => {
  // Tiny tables make the planner prefer a seq scan, so disable it: with seqscan off
  // the planner uses an index iff a usable one exists. Asserting the SPECIFIC keyset
  // index name proves it serves the equality filter + ORDER BY (no Sort), per ADR-0002.
  it('leaderboard_season_totals page query uses idx_leaderboard_season_totals_keyset', async () => {
    const sql = postgres(LOCAL_DB_URL);
    try {
      await sql`set enable_seqscan = off`;
      const rows = await sql.unsafe(
        `EXPLAIN (FORMAT JSON)
         SELECT * FROM public.leaderboard_season_totals
         WHERE group_id = '${GROUP_ID}' AND season_year = ${SEASON_YEAR}
         ORDER BY total_points desc, wins desc, pushes desc, user_id desc
         LIMIT 4`
      );
      const plan = JSON.stringify(rows[0]['QUERY PLAN']);
      expect(plan).toContain('idx_leaderboard_season_totals_keyset');
    } finally {
      await sql.end();
    }
  });

  it('group_memberships page query uses idx_group_memberships_group_role_joined', async () => {
    const sql = postgres(LOCAL_DB_URL);
    try {
      await sql`set enable_seqscan = off`;
      const rows = await sql.unsafe(
        `EXPLAIN (FORMAT JSON)
         SELECT m.* FROM public.group_memberships m
         WHERE m.group_id = '${GROUP_ID}'
         ORDER BY m.role, m.joined_at, m.user_id
         LIMIT 4`
      );
      const plan = JSON.stringify(rows[0]['QUERY PLAN']);
      expect(plan).toContain('idx_group_memberships_group_role_joined');
    } finally {
      await sql.end();
    }
  });
});
