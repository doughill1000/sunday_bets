import { describe, it, expect, vi, beforeEach } from 'vitest';

// A chainable Supabase-query mock. Filters (eq/in/gt/gte/lte/is) and order are
// recorded and applied against the per-test `db` fixture rows — but a filter on
// a column a fixture row doesn't model (undefined) passes, so specs only state
// the columns their scenario is about. Terminal value resolves via thenable /
// .single() / .maybeSingle(), keyed by table (+ head/count for games).
type Filter = { op: 'eq' | 'in' | 'gt' | 'gte' | 'lte' | 'is'; col: string; val: unknown };
type BuilderState = {
  table: string;
  head: boolean;
  op?: 'insert';
  inserted?: unknown;
  filters: Filter[];
  orderBy?: { col: string; ascending: boolean };
};

type Row = Record<string, unknown>;

let db: {
  gamesNullCount: number;
  gameRows: Row[];
  week: Row | null;
  users: { id: string; notification_prefs: unknown }[];
  notificationLogs: Row[];
  settlements: { user_id: string; outcome: string; points_delta: number }[];
  aiRecapRows: { group_id: string; prose?: string }[];
  memberships: Row[];
  picks: Row[];
  gameLines: Row[];
  teams: { id: number; short_name: string }[];
  insertedLogs: Array<Record<string, unknown>>;
};

function applyFilters(rows: Row[], state: BuilderState): Row[] {
  let out = rows.filter((row) =>
    state.filters.every((f) => {
      const v = row[f.col];
      if (v === undefined) return true; // fixture doesn't model this column
      switch (f.op) {
        case 'eq':
        case 'is':
          return v === f.val;
        case 'in':
          return (f.val as unknown[]).includes(v);
        case 'gt':
          return (v as string | number) > (f.val as string | number);
        case 'gte':
          return (v as string | number) >= (f.val as string | number);
        case 'lte':
          return (v as string | number) <= (f.val as string | number);
      }
    })
  );
  if (state.orderBy) {
    const { col, ascending } = state.orderBy;
    out = [...out].sort((a, b) => {
      const av = a[col] as string | number;
      const bv = b[col] as string | number;
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
    });
  }
  return out;
}

function resolve(state: BuilderState) {
  switch (state.table) {
    case 'games':
      return state.head
        ? { count: db.gamesNullCount, error: null }
        : { data: applyFilters(db.gameRows, state), error: null };
    case 'weeks':
      return { data: db.week, error: null };
    case 'users':
      return { data: applyFilters(db.users, state), error: null };
    case 'notification_log':
      if (state.op === 'insert') {
        db.insertedLogs.push(state.inserted as Record<string, unknown>);
        return { error: null };
      }
      return { data: applyFilters(db.notificationLogs, state), error: null };
    case 'pick_settlement':
      return { data: applyFilters(db.settlements, state), error: null };
    case 'ai_recaps':
      return { data: applyFilters(db.aiRecapRows, state), error: null };
    case 'group_memberships':
      return { data: applyFilters(db.memberships, state), error: null };
    case 'picks':
      return { data: applyFilters(db.picks, state), error: null };
    case 'game_lines':
      return { data: applyFilters(db.gameLines, state), error: null };
    case 'teams':
      return { data: applyFilters(db.teams, state), error: null };
    default:
      return { data: [], error: null };
  }
}

function makeBuilder(table: string) {
  const state: BuilderState = { table, head: false, filters: [] };
  const filter = (op: Filter['op']) => (col: string, val: unknown) => {
    state.filters.push({ op, col, val });
    return builder;
  };
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
    eq: filter('eq'),
    in: filter('in'),
    is: filter('is'),
    gt: filter('gt'),
    gte: filter('gte'),
    lte: filter('lte'),
    order: (col: string, opts?: { ascending?: boolean }) => {
      state.orderBy = { col, ascending: opts?.ascending !== false };
      return builder;
    },
    limit: () => builder,
    single: () => Promise.resolve(resolve(state)),
    maybeSingle: () => Promise.resolve(resolve(state)),
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(resolve(state)).then(onF, onR)
  };
  return builder;
}

const { sendToUser } = vi.hoisted(() => ({ sendToUser: vi.fn() }));

vi.mock('../push', () => ({ sendToUser }));
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));
vi.mock('$lib/supabase/service', () => ({
  get supabaseService() {
    return { from: (table: string) => makeBuilder(table) };
  }
}));

import { sendResultsRecap, sendAIRecapPushes, runPregameNotifications } from '../notifications';

const PREFS_ON = { enabled: true, pick_reminders: true, results_recap: true };

beforeEach(() => {
  vi.clearAllMocks();
  db = {
    gamesNullCount: 0,
    gameRows: [{ id: 'g1' }, { id: 'g2' }],
    week: { week_number: 5 },
    users: [],
    notificationLogs: [],
    settlements: [],
    aiRecapRows: [],
    memberships: [],
    picks: [],
    gameLines: [],
    teams: [],
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
      url: '/league',
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
    db.notificationLogs = [{ user_id: 'u1' }];

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
    db.aiRecapRows = [
      { group_id: 'g1', prose: 'Kefke ran the table this week. Nobody else was close.' }
    ];
    db.memberships = [{ group_id: 'g1', user_id: 'u1' }];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Week 5 recap is ready',
      body: 'Kefke ran the table this week.',
      url: '/recap?season=2025#week-5',
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
    db.notificationLogs = [{ user_id: 'u1', group_id: 'g1' }];

    const res = await sendAIRecapPushes(5);

    expect(res).toEqual({ evaluated: 1, sent: 0, skipped: 1 });
    expect(sendToUser).not.toHaveBeenCalled();
  });
});

describe('runPregameNotifications', () => {
  const NOW = new Date('2026-10-04T17:00:00Z');
  const mins = (n: number) => new Date(NOW.getTime() + n * 60_000).toISOString();
  const WEEK_ID = 9;

  // One game 60 min out: home team 1 (Bills) vs team 2 (Jets), synced history
  // showing a fresh 2-pt jump against a Bills backer (Bills -3 → Bills -1).
  function seedShiftScenario() {
    db.week = { id: WEEK_ID, week_number: 5 };
    db.gameRows = [{ id: 'g1', home_team_id: 1, commence_time: mins(60) }];
    db.teams = [
      { id: 1, short_name: 'Bills' },
      { id: 2, short_name: 'Jets' }
    ];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.picks = [
      { user_id: 'u1', game_id: 'g1', locked_spread_team_id: 1, locked_spread_value: -3 }
    ];
    db.gameLines = [
      {
        game_id: 'g1',
        source: 'fanduel',
        spread_team_id: 1,
        spread_value: -3,
        is_active_line: false,
        fetched_at: mins(-120)
      },
      {
        game_id: 'g1',
        source: 'fanduel',
        spread_team_id: 1,
        spread_value: -1,
        is_active_line: true,
        fetched_at: mins(-30)
      }
    ];
  }

  it('alerts on a fresh against-you jump, naming the side and magnitude', async () => {
    seedShiftScenario();

    const res = await runPregameNotifications(NOW);

    expect(res).toEqual({
      reminders: { evaluated: 1, sent: 0, skipped: 1 },
      lineShifts: { evaluated: 1, sent: 1 },
      pushes: 1
    });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Line moved on your pick',
      body: "The line on your Bills pick moved 2 pts — here's your shot to react before kickoff.",
      url: '/picks',
      tag: `pregame-week-${WEEK_ID}`
    });
    expect(db.insertedLogs).toEqual([
      {
        user_id: 'u1',
        kind: 'line_shift',
        game_id: 'g1',
        week_id: WEEK_ID,
        group_id: null,
        detail: { from: -3, to: -1, points: 2, threshold: 2 }
      }
    ]);
  });

  it('measures the jump against the previous synced row, not the locked line', async () => {
    seedShiftScenario();
    // Locked days ago at -8: 7 pts of cumulative drift vs the current -1. The
    // fresh jump (previous row -2.5 → current -1) is only 1.5 — under threshold.
    db.picks = [
      { user_id: 'u1', game_id: 'g1', locked_spread_team_id: 1, locked_spread_value: -8 }
    ];
    db.gameLines[0].spread_value = -2.5;

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('still alerts when the locked line equals the current line but the fresh jump qualifies', async () => {
    seedShiftScenario();
    // Locked at -1 (same as current): zero drift since lock, but the previous
    // synced row was -3 — a fresh 2-pt jump against the pick.
    db.picks = [
      { user_id: 'u1', game_id: 'g1', locked_spread_team_id: 1, locked_spread_value: -1 }
    ];

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 1 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
  });

  it('suppresses favorable moves entirely', async () => {
    seedShiftScenario();
    // Jets backer: the same Bills -3 → -1 move is 2 pts toward the Jets side.
    db.picks = [{ user_id: 'u1', game_id: 'g1', locked_spread_team_id: 2, locked_spread_value: 3 }];

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('handles a previous row stored against the other reference team', async () => {
    seedShiftScenario();
    // Same previous line (Bills -3) expressed as Jets +3; the against-you jump
    // for a Bills backer must survive the reference-team flip.
    db.gameLines[0] = { ...db.gameLines[0], spread_team_id: 2, spread_value: 3 };

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 1 });
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        body: "The line on your Bills pick moved 2 pts — here's your shot to react before kickoff."
      })
    );
  });

  it('ignores a jump that settled before the pregame window (late-moves-only)', async () => {
    seedShiftScenario();
    // The move landed 4h out and the line has been flat since.
    db.gameLines[1].fetched_at = mins(-240);

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('stays silent when there is no previous synced row to compare against', async () => {
    seedShiftScenario();
    db.gameLines = [db.gameLines[1]]; // only the active row exists

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('only considers games kicking off within the ~90-min window', async () => {
    seedShiftScenario();
    db.gameRows[0].commence_time = mins(120); // outside the window

    const res = await runPregameNotifications(NOW);

    expect(res).toEqual({
      reminders: { evaluated: 0, sent: 0, skipped: 0 },
      lineShifts: { evaluated: 0, sent: 0 },
      pushes: 0
    });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('honors the per-pick 24h cap', async () => {
    seedShiftScenario();
    db.notificationLogs = [
      { user_id: 'u1', game_id: 'g1', kind: 'line_shift', created_at: mins(-60) }
    ];

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('alerts only users who picked the game', async () => {
    seedShiftScenario();
    // u2 opted in but never picked g1: no line-shift; the unpicked game becomes
    // their reminder instead.
    db.users.push({ id: 'u2', notification_prefs: PREFS_ON });

    const res = await runPregameNotifications(NOW);

    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 1 });
    expect(sendToUser).toHaveBeenCalledTimes(2);
    expect(sendToUser).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({ title: 'Picks lock soon' })
    );
  });

  it('merges a reminder and multiple line-shifts into a single push with all logs written', async () => {
    seedShiftScenario();
    // Second picked game with its own fresh against-you jump, plus an unpicked
    // third game — all due for u1 in the same run.
    db.gameRows.push(
      { id: 'g2', home_team_id: 3, commence_time: mins(45) },
      { id: 'g3', home_team_id: 5, commence_time: mins(75) }
    );
    db.teams.push({ id: 3, short_name: 'Chiefs' });
    db.picks.push({
      user_id: 'u1',
      game_id: 'g2',
      locked_spread_team_id: 3,
      locked_spread_value: -7
    });
    db.gameLines.push(
      {
        game_id: 'g2',
        source: 'fanduel',
        spread_team_id: 3,
        spread_value: -7,
        is_active_line: false,
        fetched_at: mins(-100)
      },
      {
        game_id: 'g2',
        source: 'fanduel',
        spread_team_id: 3,
        spread_value: -4.5,
        is_active_line: true,
        fetched_at: mins(-20)
      }
    );

    const res = await runPregameNotifications(NOW);

    expect(res).toEqual({
      reminders: { evaluated: 1, sent: 1, skipped: 0 },
      lineShifts: { evaluated: 2, sent: 2 },
      pushes: 1
    });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Heads up before kickoff',
      body: 'Lines moved on 2 of your picks (Bills 2 pts, Chiefs 2.5 pts), and you have 1 unpicked game kicking off soon. Your shot to react before kickoff.',
      url: '/picks',
      tag: `pregame-week-${WEEK_ID}`
    });
    const kinds = db.insertedLogs.map((l) => `${l.kind}:${l.game_id}`).sort();
    expect(kinds).toEqual(['line_shift:g1', 'line_shift:g2', 'pick_reminder:g3']);
  });

  it('honors each toggle independently in the merged delivery', async () => {
    seedShiftScenario();
    db.gameRows.push({ id: 'g3', home_team_id: 5, commence_time: mins(75) }); // unpicked
    db.users = [
      // Reminders off, line-shift on: shift-only push, no pick_reminder log.
      { id: 'u1', notification_prefs: { ...PREFS_ON, pick_reminders: false } }
    ];

    const res = await runPregameNotifications(NOW);

    expect(res.reminders).toEqual({ evaluated: 0, sent: 0, skipped: 0 });
    expect(res.lineShifts).toEqual({ evaluated: 1, sent: 1 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Line moved on your pick' })
    );
    expect(db.insertedLogs.every((l) => l.kind === 'line_shift')).toBe(true);
  });

  it('sends a reminder-only push when line-shift is toggled off', async () => {
    seedShiftScenario();
    db.gameRows.push({ id: 'g3', home_team_id: 5, commence_time: mins(75) }); // unpicked
    db.users = [{ id: 'u1', notification_prefs: { ...PREFS_ON, line_shift: { enabled: false } } }];

    const res = await runPregameNotifications(NOW);

    expect(res.reminders).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(res.lineShifts).toEqual({ evaluated: 0, sent: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Picks lock soon' })
    );
    expect(db.insertedLogs.every((l) => l.kind === 'pick_reminder')).toBe(true);
  });

  it('sends nothing when the master switch is off', async () => {
    seedShiftScenario();
    db.gameRows.push({ id: 'g3', home_team_id: 5, commence_time: mins(75) }); // unpicked
    db.users = [{ id: 'u1', notification_prefs: { ...PREFS_ON, enabled: false } }];

    const res = await runPregameNotifications(NOW);

    expect(res.pushes).toBe(0);
    expect(sendToUser).not.toHaveBeenCalled();
    expect(db.insertedLogs).toEqual([]);
  });

  it('does not re-nudge a game already reminder-logged this week', async () => {
    db.week = { id: WEEK_ID, week_number: 5 };
    db.gameRows = [{ id: 'g1', home_team_id: 1, commence_time: mins(60) }];
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.notificationLogs = [
      { user_id: 'u1', game_id: 'g1', kind: 'pick_reminder', week_id: WEEK_ID }
    ];

    const res = await runPregameNotifications(NOW);

    expect(res.reminders).toEqual({ evaluated: 1, sent: 0, skipped: 1 });
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('skips line-shift evaluation when includeLineShifts is false', async () => {
    seedShiftScenario();
    db.gameRows.push({ id: 'g3', home_team_id: 5, commence_time: mins(75) }); // unpicked

    const res = await runPregameNotifications(NOW, { includeLineShifts: false });

    expect(res.lineShifts).toEqual({ skipped: true });
    expect(res.reminders).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Picks lock soon' })
    );
  });
});
