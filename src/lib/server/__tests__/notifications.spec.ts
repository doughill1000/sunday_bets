import { describe, it, expect, vi, beforeEach } from 'vitest';

// A tiny chainable Supabase-query mock. Every filter returns the builder; the
// terminal value is resolved (via thenable / .single()) from the per-test `db`
// fixture, keyed by table + whether a head/count query was requested.
type BuilderState = {
  table: string;
  head: boolean;
  op?: 'insert';
  inserted?: unknown;
};

let db: {
  gamesNullCount: number;
  gameRows: { id: string }[];
  week: { week_number: number; seasons?: { year: number } } | null;
  users: { id: string; notification_prefs: unknown }[];
  recapLogs: { user_id: string; group_id?: string }[];
  settlements: { user_id: string; outcome: string; points_delta: number }[];
  aiRecapRows: { group_id: string }[];
  memberships: { group_id: string; user_id: string }[];
  insertedLogs: Array<Record<string, unknown>>;
};

function resolve(state: BuilderState) {
  switch (state.table) {
    case 'games':
      return state.head
        ? { count: db.gamesNullCount, error: null }
        : { data: db.gameRows, error: null };
    case 'weeks':
      return { data: db.week, error: null };
    case 'users':
      return { data: db.users, error: null };
    case 'notification_log':
      if (state.op === 'insert') {
        db.insertedLogs.push(state.inserted as Record<string, unknown>);
        return { error: null };
      }
      return { data: db.recapLogs, error: null };
    case 'pick_settlement':
      return { data: db.settlements, error: null };
    case 'ai_recaps':
      return { data: db.aiRecapRows, error: null };
    case 'group_memberships':
      return { data: db.memberships, error: null };
    default:
      return { data: [], error: null };
  }
}

function makeBuilder(table: string) {
  const state: BuilderState = { table, head: false };
  const builder: Record<string, unknown> = {
    select: (_cols?: unknown, opts?: { head?: boolean }) => {
      if (opts?.head) state.head = true;
      return builder;
    },
    insert: (row: unknown) => {
      state.op = 'insert';
      state.inserted = row;
      return builder;
    },
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    gt: () => builder,
    lte: () => builder,
    gte: () => builder,
    single: () => Promise.resolve(resolve(state)),
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(resolve(state)).then(onF, onR)
  };
  return builder;
}

const { sendToUser } = vi.hoisted(() => ({ sendToUser: vi.fn() }));

vi.mock('../push', () => ({ sendToUser }));
vi.mock('$lib/supabase/service', () => ({
  get supabaseService() {
    return { from: (table: string) => makeBuilder(table) };
  }
}));

import { sendResultsRecap, sendAIRecapPushes } from '../notifications';

const PREFS_ON = { enabled: true, pick_reminders: true, results_recap: true };

beforeEach(() => {
  vi.clearAllMocks();
  db = {
    gamesNullCount: 0,
    gameRows: [{ id: 'g1' }, { id: 'g2' }],
    week: { week_number: 5 },
    users: [],
    recapLogs: [],
    settlements: [],
    aiRecapRows: [],
    memberships: [],
    insertedLogs: []
  };
  sendToUser.mockResolvedValue({ sent: 1, pruned: 0 });
});

describe('sendResultsRecap', () => {
  it('is a no-op until the week is fully graded', async () => {
    db.gamesNullCount = 1; // one game still ungraded
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.settlements = [{ user_id: 'u1', outcome: 'win', points_delta: 3 }];

    const res = await sendResultsRecap(5);

    expect(res).toEqual({ evaluated: 0, sent: 0, skipped: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('sends one push per opted-in user with results and logs it', async () => {
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.settlements = [
      { user_id: 'u1', outcome: 'win', points_delta: 3 },
      { user_id: 'u1', outcome: 'loss', points_delta: -1 }
    ];

    const res = await sendResultsRecap(5);

    expect(res).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Your Week 5 results',
      body: '1-1 · +2 points this week. Tap for standings.',
      url: '/leaderboard',
      tag: 'results-recap-week-5'
    });
    expect(db.insertedLogs).toEqual([
      {
        user_id: 'u1',
        kind: 'results_recap',
        game_id: null,
        week_id: 5,
        group_id: null,
        detail: { wins: 1, losses: 1, pushes: 0, missed: 0, net: 2 }
      }
    ]);
  });

  it('aggregates a user settlements across all of their groups', async () => {
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    // Same user, same week, two different groups.
    db.settlements = [
      { user_id: 'u1', outcome: 'win', points_delta: 5 },
      { user_id: 'u1', outcome: 'push', points_delta: 0 },
      { user_id: 'u1', outcome: 'win', points_delta: 4 }
    ];

    await sendResultsRecap(5);

    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: '2-0 with 1 push · +9 points this week. Tap for standings.' })
    );
  });

  it('respects opt-out (master off or results_recap off)', async () => {
    db.users = [
      { id: 'u1', notification_prefs: { ...PREFS_ON, enabled: false } },
      { id: 'u2', notification_prefs: { ...PREFS_ON, results_recap: false } }
    ];
    db.settlements = [
      { user_id: 'u1', outcome: 'win', points_delta: 3 },
      { user_id: 'u2', outcome: 'win', points_delta: 3 }
    ];

    const res = await sendResultsRecap(5);

    expect(res).toEqual({ evaluated: 0, sent: 0, skipped: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('dedupes a user already recapped for the week', async () => {
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.settlements = [{ user_id: 'u1', outcome: 'win', points_delta: 3 }];
    db.recapLogs = [{ user_id: 'u1' }];

    const res = await sendResultsRecap(5);

    expect(res).toEqual({ evaluated: 0, sent: 0, skipped: 1 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('skips opted-in users with no settlements this week', async () => {
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.settlements = []; // user picked nothing / nothing settled

    const res = await sendResultsRecap(5);

    expect(res).toEqual({ evaluated: 0, sent: 0, skipped: 1 });
    expect(sendToUser).not.toHaveBeenCalled();
  });
});

describe('sendAIRecapPushes', () => {
  beforeEach(() => {
    db.week = { week_number: 5, seasons: { year: 2025 } };
  });

  it('is a no-op when no ai_recaps rows exist for the week', async () => {
    db.aiRecapRows = [];
    db.memberships = [{ group_id: 'g1', user_id: 'u1' }];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 0, sent: 0, skipped: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('sends one push per opted-in group member and logs it with group_id', async () => {
    db.aiRecapRows = [{ group_id: 'g1' }];
    db.memberships = [{ group_id: 'g1', user_id: 'u1' }];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Week 5 recap is ready',
      body: 'Your league’s AI recap just dropped.',
      url: '/recap',
      tag: 'ai-recap-g1-week-5'
    });
    expect(db.insertedLogs).toEqual([
      {
        user_id: 'u1',
        kind: 'ai_recap',
        game_id: null,
        week_id: 5,
        group_id: 'g1',
        detail: null
      }
    ]);
  });

  it('sends a separate push per group when a user belongs to more than one', async () => {
    db.aiRecapRows = [{ group_id: 'g1' }, { group_id: 'g2' }];
    db.memberships = [
      { group_id: 'g1', user_id: 'u1' },
      { group_id: 'g2', user_id: 'u1' }
    ];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 2, sent: 2, skipped: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(2);
  });

  it('respects opt-out (master off or ai_recap off)', async () => {
    db.aiRecapRows = [{ group_id: 'g1' }];
    db.memberships = [
      { group_id: 'g1', user_id: 'u1' },
      { group_id: 'g1', user_id: 'u2' }
    ];
    db.users = [
      { id: 'u1', notification_prefs: { ...PREFS_ON, enabled: false } },
      { id: 'u2', notification_prefs: { ...PREFS_ON, ai_recap: false } }
    ];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 0, sent: 0, skipped: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('dedupes a (user, group) already pushed for the week', async () => {
    db.aiRecapRows = [{ group_id: 'g1' }];
    db.memberships = [{ group_id: 'g1', user_id: 'u1' }];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.recapLogs = [{ user_id: 'u1', group_id: 'g1' }];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 1, sent: 0, skipped: 1 });
    expect(sendToUser).not.toHaveBeenCalled();
  });
});
