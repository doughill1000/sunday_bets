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

import { sendWeeklyRecap, runPregameNotifications } from '../notifications';

const PREFS_ON = { enabled: true, pick_reminders: true, results_recap: true };

// #815: every log row records what its push achieved. These are the two outcomes the
// specs assert against — one device took it, or the push died on the wire.
const DELIVERED = { delivery: { sent: 1, total: 1, pruned: 0 } };
const UNDELIVERED = { sent: 0, pruned: 0, total: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  db = {
    gamesNullCount: 0,
    gameRows: [{ id: 'g1' }, { id: 'g2' }],
    // Every `weeks` lookup resolves to this one fixture, so it carries the
    // `seasons!inner(year)` join both recap senders now select (#818).
    week: { week_number: 5, is_scoring: true, seasons: { year: 2026 } },
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
  sendToUser.mockResolvedValue({ sent: 1, pruned: 0, total: 1 });
});

// A preseason round (ADR-0016): negative week_number, is_scoring false.
const NON_SCORING_WEEK = { week_number: -1, is_scoring: false, seasons: { year: 2026 } };

// The merged Tuesday-morning pass (#813). These replace the separate sendResultsRecap /
// sendAIRecapPushes blocks: the two concerns are still independently detected, gated and
// logged, but they now share one delivery.
//
// Fixture note: the query mock passes any filter on a column a row doesn't model, so
// notification_log rows here always state their `kind` — without it a single fixture row
// would satisfy BOTH concerns' dedup queries and quietly prove nothing.
describe('sendWeeklyRecap', () => {
  const PROSE = 'Kefke ran the table this week. Nobody else was close.';
  const BEAT = 'Kefke ran the table this week.';
  const bothDue = () => {
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.settlements = [
      { user_id: 'u1', outcome: 'win', points_delta: 3 },
      { user_id: 'u1', outcome: 'loss', points_delta: -1 }
    ];
    db.aiRecapRows = [{ group_id: 'g1', prose: PROSE }];
    db.memberships = [{ group_id: 'g1', user_id: 'u1' }];
  };
  const ZERO = { evaluated: 0, sent: 0, skipped: 0 };

  it('is a no-op on a non-scoring round (#789)', async () => {
    // Preseason is typically a single game, so it reads fully-graded the moment that
    // game ends — the completeness gate alone never stopped it.
    db.week = NON_SCORING_WEEK;
    bothDue();

    const res = await sendWeeklyRecap(112);

    expect(res).toEqual({ results: ZERO, aiRecaps: ZERO, pushes: 0, delivered: 0 });
    expect(sendToUser).not.toHaveBeenCalled();
    expect(db.insertedLogs).toEqual([]);
  });

  // AC #1 + #2 + #4: the whole point of the issue.
  it('delivers ONE push carrying both halves, and logs both concerns against it', async () => {
    bothDue();

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Your Week 5 results',
      body: `1-1 · +2 points. “${BEAT}”`,
      url: '/week?season=2026&week=5',
      tag: 'weekly-recap-g1-week-5'
    });
    expect(res).toEqual({
      results: { evaluated: 1, sent: 1, skipped: 0 },
      aiRecaps: { evaluated: 1, sent: 1, skipped: 0 },
      pushes: 1,
      delivered: 1
    });
    // Both ledgers still written, both carrying the one delivery result (#815), and
    // results_recap stays group-less so its cross-group dedup is unchanged.
    expect(db.insertedLogs).toEqual([
      {
        user_id: 'u1',
        kind: 'ai_recap',
        game_id: null,
        week_id: 5,
        group_id: 'g1',
        detail: DELIVERED
      },
      {
        user_id: 'u1',
        kind: 'results_recap',
        game_id: null,
        week_id: 5,
        group_id: null,
        detail: { wins: 1, losses: 1, pushes: 0, missed: 0, net: 2, ...DELIVERED }
      }
    ]);
  });

  // AC #6 / the asymmetric-gate trap: isWeekFullyGraded belongs to results DETECTION.
  // The AI half's gate is "an ai_recaps row exists", written by the grade cron ~9h
  // earlier — hoisting completeness up a level would silently kill the recap push.
  it('still sends the recap half when the week is not fully graded', async () => {
    bothDue();
    db.gamesNullCount = 1; // one game still ungraded

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Week 5 recap is ready', body: BEAT })
    );
    expect(res.results).toEqual(ZERO);
    expect(res.aiRecaps).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
  });

  // AC #9: this was a whole-function early return in sendResultsRecap, so a week with
  // no game rows took the AI recap down with it.
  it('still sends the recap half when the week has no games', async () => {
    bothDue();
    db.gameRows = [];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Week 5 recap is ready' })
    );
    expect(res.results).toEqual(ZERO);
    expect(res.aiRecaps).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
  });

  // AC #3, results side: unchanged in content and destination.
  it('sends a results-only push, keyed (user, null), when no recap row exists', async () => {
    bothDue();
    db.aiRecapRows = [];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Your Week 5 results',
      body: '1-1 · +2 points this week. Tap for the breakdown.',
      url: '/week?season=2026&week=5',
      tag: 'weekly-recap-you-week-5'
    });
    expect(res).toEqual({
      results: { evaluated: 1, sent: 1, skipped: 0 },
      aiRecaps: ZERO,
      pushes: 1,
      delivered: 1
    });
    expect(db.insertedLogs).toEqual([
      {
        user_id: 'u1',
        kind: 'results_recap',
        game_id: null,
        week_id: 5,
        group_id: null,
        detail: { wins: 1, losses: 1, pushes: 0, missed: 0, net: 2, ...DELIVERED }
      }
    ]);
  });

  // AC #3, recap side.
  it('sends a recap-only push when the user has nothing settled', async () => {
    bothDue();
    db.settlements = [];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith('u1', {
      title: 'Week 5 recap is ready',
      body: BEAT,
      url: '/week?season=2026&week=5',
      tag: 'weekly-recap-g1-week-5'
    });
    expect(res.results).toEqual({ evaluated: 1, sent: 0, skipped: 1 });
    expect(res.aiRecaps).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
  });

  // AC #7 / #818 regression: the cron fires Tuesday 14:00 UTC, 14 hours after week N+1's
  // window opened, so `/week`'s "latest started week" default would land the tap on the
  // empty next week. Both halves now share one link, so it is named once, outright.
  it('deep-links to the reported week, not whichever week is active at send time', async () => {
    db.week = { week_number: 12, is_scoring: true, seasons: { year: 2026 } };
    bothDue();

    await sendWeeklyRecap(42);

    const payload = sendToUser.mock.calls[0][1];
    expect(payload.url).toBe('/week?season=2026&week=12');
    // Copy and link agree on which week this push is about.
    expect(payload.title).toBe('Your Week 12 results');
  });

  // AC #8 + the tag trap: push-handler.js sets `renotify` whenever a tag is present
  // (#814), so a shared tag would leave one buzz and one surviving notification.
  it('sends one push per group, tagged per group, with the record on the first only', async () => {
    bothDue();
    db.aiRecapRows = [
      { group_id: 'g1', prose: PROSE },
      { group_id: 'g2', prose: 'Sam finally showed up. Barely.' }
    ];
    db.memberships = [
      { group_id: 'g1', user_id: 'u1' },
      { group_id: 'g2', user_id: 'u1' }
    ];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(2);
    const [first, second] = sendToUser.mock.calls.map((c) => c[1]);
    expect(first).toEqual({
      title: 'Your Week 5 results',
      body: `1-1 · +2 points. “${BEAT}”`,
      url: '/week?season=2026&week=5',
      tag: 'weekly-recap-g1-week-5'
    });
    // The record is cross-group, so it is told once — the second push is the beat alone.
    expect(second).toEqual({
      title: 'Week 5 recap is ready',
      body: 'Sam finally showed up.',
      url: '/week?season=2026&week=5',
      tag: 'weekly-recap-g2-week-5'
    });
    expect(first.tag).not.toBe(second.tag);
    expect(res).toEqual({
      results: { evaluated: 1, sent: 1, skipped: 0 },
      aiRecaps: { evaluated: 2, sent: 2, skipped: 0 },
      pushes: 2,
      delivered: 2
    });
    // One results_recap row across both groups — its dedup is keyed on kind + week + user.
    expect(db.insertedLogs.filter((l) => l.kind === 'results_recap')).toHaveLength(1);
    expect(db.insertedLogs.filter((l) => l.kind === 'ai_recap').map((l) => l.group_id)).toEqual([
      'g1',
      'g2'
    ]);
  });

  it('dedupes a user already pushed for both concerns', async () => {
    bothDue();
    db.notificationLogs = [
      { user_id: 'u1', kind: 'results_recap' },
      { user_id: 'u1', kind: 'ai_recap', group_id: 'g1' }
    ];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).not.toHaveBeenCalled();
    expect(res).toEqual({
      results: { evaluated: 1, sent: 0, skipped: 1 },
      aiRecaps: { evaluated: 1, sent: 0, skipped: 1 },
      pushes: 0,
      delivered: 0
    });
  });

  // AC #4, the partial-failure half: the results push landed last week's run, the recap
  // row only showed up afterwards. The next tick owes the recap and nothing else.
  it('sends only the missing concern when the other already landed', async () => {
    bothDue();
    db.notificationLogs = [{ user_id: 'u1', kind: 'results_recap', detail: DELIVERED }];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Week 5 recap is ready', body: BEAT })
    );
    expect(res.results).toEqual({ evaluated: 1, sent: 0, skipped: 1 });
    expect(res.aiRecaps).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(db.insertedLogs.map((l) => l.kind)).toEqual(['ai_recap']);
  });

  // #815 regression: the outage that used to grade green.
  it('reports zero delivered when the merged push reaches no device', async () => {
    bothDue();
    sendToUser.mockResolvedValue(UNDELIVERED);

    const res = await sendWeeklyRecap(5);

    // Attempted 1, delivered 0 — the two numbers a healthy run can't produce together.
    expect(res.pushes).toBe(1);
    expect(res.delivered).toBe(0);
    for (const log of db.insertedLogs) {
      expect(log.detail).toMatchObject({ delivery: { sent: 0, total: 1, pruned: 0 } });
    }
  });

  // A failed merged push spent neither slot, so the next tick owes both again.
  it('re-sends both concerns after a merged push that died on the wire', async () => {
    bothDue();
    db.notificationLogs = [
      { user_id: 'u1', kind: 'results_recap', detail: { delivery: { sent: 0, total: 2 } } },
      {
        user_id: 'u1',
        kind: 'ai_recap',
        group_id: 'g1',
        detail: { delivery: { sent: 0, total: 2 } }
      }
    ];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: `1-1 · +2 points. “${BEAT}”` })
    );
    expect(res.results.sent).toBe(1);
    expect(res.aiRecaps.sent).toBe(1);
  });

  // total: 0 — nothing to retry. Releasing these slots would re-push and re-log on
  // every run for as long as the user stays unsubscribed.
  it('holds both slots for a user with no subscriptions to deliver to', async () => {
    bothDue();
    db.notificationLogs = [
      { user_id: 'u1', kind: 'results_recap', detail: { delivery: { sent: 0, total: 0 } } },
      {
        user_id: 'u1',
        kind: 'ai_recap',
        group_id: 'g1',
        detail: { delivery: { sent: 0, total: 0 } }
      }
    ];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).not.toHaveBeenCalled();
    expect(res.pushes).toBe(0);
  });

  it('aggregates a user settlements across all of their groups', async () => {
    bothDue();
    db.aiRecapRows = [];
    // Same user, same week, two different groups.
    db.settlements = [
      { user_id: 'u1', outcome: 'win', points_delta: 5 },
      { user_id: 'u1', outcome: 'push', points_delta: 0 },
      { user_id: 'u1', outcome: 'win', points_delta: 4 }
    ];

    await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        body: '2-0 with 1 push · +9 points this week. Tap for the breakdown.'
      })
    );
  });

  it('respects the master switch', async () => {
    bothDue();
    db.users = [{ id: 'u1', notification_prefs: { ...PREFS_ON, enabled: false } }];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).not.toHaveBeenCalled();
    expect(res).toEqual({ results: ZERO, aiRecaps: ZERO, pushes: 0, delivered: 0 });
  });

  // Decision 3 of the scoping interview: only delivery merges, the two toggles stay
  // independent — so turning one off leaves the other's push exactly as it was.
  it('sends the recap half alone when only results_recap is off', async () => {
    bothDue();
    db.users = [{ id: 'u1', notification_prefs: { ...PREFS_ON, results_recap: false } }];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Week 5 recap is ready', body: BEAT })
    );
    expect(res.results).toEqual(ZERO);
  });

  it('sends the results half alone when only ai_recap is off', async () => {
    bothDue();
    db.users = [{ id: 'u1', notification_prefs: { ...PREFS_ON, ai_recap: false } }];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        title: 'Your Week 5 results',
        body: '1-1 · +2 points this week. Tap for the breakdown.',
        tag: 'weekly-recap-you-week-5'
      })
    );
    expect(res.aiRecaps).toEqual(ZERO);
  });

  it('is a no-op when no ai_recaps row exists and nobody has results', async () => {
    db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
    db.memberships = [{ group_id: 'g1', user_id: 'u1' }];

    const res = await sendWeeklyRecap(5);

    expect(sendToUser).not.toHaveBeenCalled();
    expect(res).toEqual({
      results: { evaluated: 1, sent: 0, skipped: 1 },
      aiRecaps: ZERO,
      pushes: 0,
      delivered: 0
    });
  });
});

describe('runPregameNotifications', () => {
  const NOW = new Date('2026-10-04T17:00:00Z');
  const mins = (n: number) => new Date(NOW.getTime() + n * 60_000).toISOString();
  const WEEK_ID = 9;

  // One game 60 min out: home team 1 (Bills) vs team 2 (Jets), synced history
  // showing a fresh 2-pt jump against a Bills backer (Bills -3 → Bills -1).
  function seedShiftScenario() {
    db.week = { id: WEEK_ID, week_number: 5, is_scoring: true };
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
      pushes: 1,
      delivered: 1
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
        // The delivery result rides alongside the line-shift detail, not instead of it.
        detail: { from: -3, to: -1, points: 2, threshold: 2, ...DELIVERED }
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
      pushes: 0,
      delivered: 0
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
      pushes: 1,
      delivered: 1
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
    db.week = { id: WEEK_ID, week_number: 5, is_scoring: true };
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

    expect(res.lineShifts).toEqual({ skipped: true, reason: 'no odds sync' });
    expect(res.reminders).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'Picks lock soon' })
    );
  });

  // A non-scoring round (ADR-0016) is pickable but worth zero, so the two pregame
  // lanes get opposite answers (#793). #731 merged them into one delivery step, so
  // each case below pins which lane survived — a gate placed on the function or on
  // that loop instead of on detection would pass the first case and fail these.
  describe('on a non-scoring round (#793)', () => {
    const PRESEASON_WEEK = { id: WEEK_ID, week_number: -1, is_scoring: false };
    const NON_SCORING_REMINDER =
      "You have 1 unpicked game kicking off soon. This round doesn't count — just for fun.";

    it('drops a qualifying line shift however far the line moved', async () => {
      seedShiftScenario();
      db.week = PRESEASON_WEEK;
      // 13 pts against the pick — far past the 2-pt threshold. Magnitude buys no
      // exception on a round where the pick is worth nothing either way.
      db.gameLines[0].spread_value = -14;

      const res = await runPregameNotifications(NOW);

      expect(res).toEqual({
        reminders: { evaluated: 1, sent: 0, skipped: 1 },
        lineShifts: { skipped: true, reason: 'non-scoring round' },
        pushes: 0,
        delivered: 0
      });
      expect(sendToUser).not.toHaveBeenCalled();
      expect(db.insertedLogs).toEqual([]);
    });

    it('still nudges an unpicked game, and says the round does not count', async () => {
      seedShiftScenario();
      db.week = PRESEASON_WEEK;
      db.picks = []; // g1 unpicked: the reminder is the only signal in play

      const res = await runPregameNotifications(NOW);

      expect(res.reminders).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
      expect(sendToUser).toHaveBeenCalledTimes(1);
      expect(sendToUser).toHaveBeenCalledWith('u1', {
        title: 'Picks lock soon',
        body: NON_SCORING_REMINDER,
        url: '/picks',
        tag: `pregame-week-${WEEK_ID}`
      });
      expect(db.insertedLogs).toEqual([
        {
          user_id: 'u1',
          kind: 'pick_reminder',
          game_id: 'g1',
          week_id: WEEK_ID,
          group_id: null,
          detail: DELIVERED
        }
      ]);
    });

    it('keeps the reminder and drops the shift when both are due in the same run', async () => {
      seedShiftScenario(); // g1: picked, with a fresh 2-pt jump against u1
      db.week = PRESEASON_WEEK;
      db.gameRows.push({ id: 'g3', home_team_id: 5, commence_time: mins(75) }); // unpicked

      const res = await runPregameNotifications(NOW);

      expect(res).toEqual({
        reminders: { evaluated: 1, sent: 1, skipped: 0 },
        lineShifts: { skipped: true, reason: 'non-scoring round' },
        pushes: 1,
        delivered: 1
      });
      // One push, reminder copy only — no trace of the line move in body or log.
      expect(sendToUser).toHaveBeenCalledTimes(1);
      expect(sendToUser).toHaveBeenCalledWith('u1', {
        title: 'Picks lock soon',
        body: NON_SCORING_REMINDER,
        url: '/picks',
        tag: `pregame-week-${WEEK_ID}`
      });
      expect(db.insertedLogs).toEqual([
        {
          user_id: 'u1',
          kind: 'pick_reminder',
          game_id: 'g3',
          week_id: WEEK_ID,
          group_id: null,
          detail: DELIVERED
        }
      ]);
    });
  });

  // #815: the run in the issue report — pushes: 1, everything green, nothing on any
  // device. Delivery is now counted separately, and an undelivered notification does
  // not spend its dedup slot.
  describe('when a push reaches no device (#815)', () => {
    it('separates attempts from deliveries in the summary', async () => {
      seedShiftScenario();
      sendToUser.mockResolvedValue(UNDELIVERED);

      const res = await runPregameNotifications(NOW);

      expect(res.pushes).toBe(1);
      expect(res.delivered).toBe(0);
    });

    it('records the delivery result on the log row it writes', async () => {
      seedShiftScenario();
      sendToUser.mockResolvedValue(UNDELIVERED);

      await runPregameNotifications(NOW);

      expect(db.insertedLogs).toHaveLength(1);
      expect(db.insertedLogs[0].detail).toEqual({
        from: -3,
        to: -1,
        points: 2,
        threshold: 2,
        delivery: { sent: 0, total: 1, pruned: 0 }
      });
    });

    it('re-nudges a game whose reminder reached no device', async () => {
      db.week = { id: WEEK_ID, week_number: 5, is_scoring: true };
      db.gameRows = [{ id: 'g1', home_team_id: 1, commence_time: mins(60) }];
      db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
      // The row from the issue: logged, deduped forever, never seen by anyone.
      db.notificationLogs = [
        {
          user_id: 'u1',
          game_id: 'g1',
          kind: 'pick_reminder',
          week_id: WEEK_ID,
          detail: { delivery: { sent: 0, total: 6 } }
        }
      ];

      const res = await runPregameNotifications(NOW);

      expect(res.reminders).toEqual({ evaluated: 1, sent: 1, skipped: 0 });
      expect(res.delivered).toBe(1);
      expect(sendToUser).toHaveBeenCalledTimes(1);
    });

    it('does not re-nudge when the user has no subscriptions to reach', async () => {
      db.week = { id: WEEK_ID, week_number: 5, is_scoring: true };
      db.gameRows = [{ id: 'g1', home_team_id: 1, commence_time: mins(60) }];
      db.users = [{ id: 'u1', notification_prefs: PREFS_ON }];
      db.notificationLogs = [
        {
          user_id: 'u1',
          game_id: 'g1',
          kind: 'pick_reminder',
          week_id: WEEK_ID,
          detail: { delivery: { sent: 0, total: 0 } }
        }
      ];

      const res = await runPregameNotifications(NOW);

      expect(res.reminders).toEqual({ evaluated: 1, sent: 0, skipped: 1 });
      expect(sendToUser).not.toHaveBeenCalled();
    });

    it('does not spend the 24h line-shift cap on an undelivered alert', async () => {
      seedShiftScenario();
      db.notificationLogs = [
        {
          user_id: 'u1',
          game_id: 'g1',
          kind: 'line_shift',
          created_at: mins(-60),
          detail: { delivery: { sent: 0, total: 2 } }
        }
      ];

      const res = await runPregameNotifications(NOW);

      expect(res.lineShifts).toEqual({ evaluated: 1, sent: 1 });
      expect(sendToUser).toHaveBeenCalledTimes(1);
    });

    it('still honors the cap for an alert that was delivered', async () => {
      seedShiftScenario();
      db.notificationLogs = [
        {
          user_id: 'u1',
          game_id: 'g1',
          kind: 'line_shift',
          created_at: mins(-60),
          detail: { delivery: { sent: 2, total: 2 } }
        }
      ];

      const res = await runPregameNotifications(NOW);

      expect(res.lineShifts).toEqual({ evaluated: 1, sent: 0 });
      expect(sendToUser).not.toHaveBeenCalled();
    });
  });
});
