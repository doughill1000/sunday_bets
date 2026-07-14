import { describe, it, expect, vi, afterEach } from 'vitest';

// rebuild.ts pulls in the lazy service-role client at import time; we always pass an explicit
// in-memory client below, so stub the module to keep the import env-free (matches grading.spec).
vi.mock('$lib/supabase/service', () => ({ supabaseService: {} }));

import { rebuildPlayerRatings } from '../rebuild';
import type { RatingDecision } from '../computeRatings';

type StoreRow = { group_id: string; user_id: string; computed_at: string; [k: string]: unknown };

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** Flush enough microtask hops to drive a parked rebuild from one gated await to the next. */
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

/** Two players in one group, each with a couple of settled decisions → two rating rows. */
function makeInputs(): RatingDecision[] {
  const base = {
    season_year: 2024,
    commence_time: '2024-09-01T00:00:00.000Z',
    weight: 'M' as const
  };
  const mk = (
    user_id: string,
    game_id: string,
    outcome: RatingDecision['outcome']
  ): RatingDecision => ({ group_id: 'g1', user_id, game_id, outcome, ...base });
  return [
    mk('u1', 'g-1', 'win'),
    mk('u1', 'g-2', 'loss'),
    mk('u2', 'g-3', 'win'),
    mk('u2', 'g-4', 'push')
  ];
}

/**
 * A minimal fake supabase-js client over a shared in-memory `player_ratings` array, implementing
 * exactly the calls rebuildPlayerRatings makes: paged input reads, upsert-by-(group,user), and the
 * `delete().lt('computed_at', …)` prune. Optional `gates` defer the input fetch and the upsert so a
 * test can interleave two rebuilds deterministically.
 */
function makeClient(
  store: StoreRow[],
  inputs: RatingDecision[],
  gates?: { fetch?: { promise: Promise<unknown> }; upsert?: { promise: Promise<unknown> } }
) {
  return {
    from(table: string) {
      if (table === 'player_rating_inputs') {
        const builder = {
          select: () => builder,
          order: () => builder,
          range: (from: number, to: number) => {
            const res = { data: inputs.slice(from, to + 1), error: null };
            return gates?.fetch ? gates.fetch.promise.then(() => res) : Promise.resolve(res);
          }
        };
        return builder;
      }
      if (table === 'player_ratings') {
        return {
          upsert: (rows: StoreRow[]) => {
            for (const r of rows) {
              const i = store.findIndex(
                (x) => x.group_id === r.group_id && x.user_id === r.user_id
              );
              if (i >= 0) store[i] = { ...r };
              else store.push({ ...r });
            }
            const res = { error: null };
            return gates?.upsert ? gates.upsert.promise.then(() => res) : Promise.resolve(res);
          },
          delete: () => ({
            lt: (col: string, val: string) => {
              for (let i = store.length - 1; i >= 0; i--) {
                if (String(store[i][col]) < val) store.splice(i, 1);
              }
              return Promise.resolve({ error: null });
            }
          })
        };
      }
      throw new Error(`unexpected table ${table}`);
    }
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

afterEach(() => vi.useRealTimers());

describe('rebuildPlayerRatings', () => {
  it('upserts the live ratings and prunes rows carrying an older stamp', async () => {
    const store: StoreRow[] = [
      // A player who dropped out of the current result set — stamped by a prior run.
      { group_id: 'g1', user_id: 'gone', computed_at: '2020-01-01T00:00:00.000Z', rating: 1500 }
    ];
    await rebuildPlayerRatings(makeClient(store, makeInputs()));

    expect(new Set(store.map((r) => r.user_id))).toEqual(new Set(['u1', 'u2']));
  });

  it('clears the table when there are no settled decisions', async () => {
    const store: StoreRow[] = [
      { group_id: 'g1', user_id: 'u1', computed_at: '2020-01-01T00:00:00.000Z', rating: 1500 }
    ];
    await rebuildPlayerRatings(makeClient(store, []));

    expect(store.length).toBe(0);
  });

  // Regression for #622: the grade cron used to fan out one full rebuild per week, concurrently.
  // With the old `delete where computed_at != T` prune, the interleaving below (both upsert, then
  // both delete) let the first delete wipe every row the second rebuild had just re-stamped,
  // transiently EMPTYING player_ratings. The `lt` prune deletes only strictly-older stamps, so a
  // peer's freshly-written rows survive.
  it('two concurrent rebuilds with identical inputs never empty player_ratings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const store: StoreRow[] = [];
    const inputs = makeInputs();

    const aFetch = deferred();
    const aUpsert = deferred();
    const bFetch = deferred();
    const bUpsert = deferred();

    const pA = rebuildPlayerRatings(makeClient(store, inputs, { fetch: aFetch, upsert: aUpsert }));
    const pB = rebuildPlayerRatings(makeClient(store, inputs, { fetch: bFetch, upsert: bUpsert }));
    await flush(); // both rebuilds now parked on their input fetch

    // A reads its inputs and stamps every row at T1, then parks before pruning.
    vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'));
    aFetch.resolve();
    await flush();

    // B reads the same inputs and RE-STAMPS every row at a later T2 — the dangerous overlap.
    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));
    bFetch.resolve();
    await flush();

    // Every row now carries T2. Release A's prune (delete < T1) first, then B's (delete < T2).
    aUpsert.resolve();
    bUpsert.resolve();
    await Promise.all([pA, pB]);

    // A's `< T1` delete cannot touch B's T2 rows: the table keeps both players, never emptied.
    expect(store.length).toBe(2);
    expect(new Set(store.map((r) => r.user_id))).toEqual(new Set(['u1', 'u2']));
  });
});
