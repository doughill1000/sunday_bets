import { describe, it, expect } from 'vitest';

import { rebuildPlayerRatings } from '../rebuild';
import type { RatingDecision } from '../computeRatings';

type StoreRow = { group_id: string; user_id: string; computed_at: string; [k: string]: unknown };

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
 * exactly the calls rebuildPlayerRatings makes: paged input reads, and the atomic
 * `_rebuild_player_ratings` RPC (issue #619) — mirroring that SQL function's own upsert-on-conflict
 * + `computed_at < p_computed_at` prune (supabase/src/functions/_private/rebuild_player_ratings.sql)
 * so this mock stays a faithful stand-in without re-testing Postgres itself.
 */
function makeClient(store: StoreRow[], inputs: RatingDecision[]) {
  return {
    from(table: string) {
      if (table === 'player_rating_inputs') {
        const builder = {
          select: () => builder,
          order: () => builder,
          range: (from: number, to: number) =>
            Promise.resolve({ data: inputs.slice(from, to + 1), error: null })
        };
        return builder;
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc(fn: string, args: { p_rows: StoreRow[]; p_computed_at: string }) {
      if (fn !== '_rebuild_player_ratings') throw new Error(`unexpected rpc ${fn}`);
      for (const r of args.p_rows) {
        const row = { ...r, computed_at: args.p_computed_at };
        const i = store.findIndex((x) => x.group_id === r.group_id && x.user_id === r.user_id);
        if (i >= 0) store[i] = row;
        else store.push(row);
      }
      for (let i = store.length - 1; i >= 0; i--) {
        if (store[i].computed_at < args.p_computed_at) store.splice(i, 1);
      }
      return Promise.resolve({ error: null });
    }
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

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

  it('calls the atomic RPC once with every computed row and a single computed_at stamp', async () => {
    const store: StoreRow[] = [];
    let captured: { p_rows: StoreRow[]; p_computed_at: string } | undefined;
    const client = {
      from: makeClient(store, makeInputs()).from,
      rpc: (fn: string, args: typeof captured) => {
        captured = args;
        return Promise.resolve({ error: null });
      }
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    await rebuildPlayerRatings(client);

    expect(captured?.p_rows).toHaveLength(2);
    expect(new Set(captured?.p_rows.map((r) => r.user_id))).toEqual(new Set(['u1', 'u2']));
    expect(captured?.p_computed_at).toEqual(expect.any(String));
  });

  // Concurrent-rebuild safety (#619) is no longer testable by racing two mocked calls against each
  // other: the upsert+prune pair that #622's regression test exercised here now runs as ONE RPC
  // call, atomic by construction in this mock (and, for real Postgres, serialized by the RPC's own
  // transaction-scoped advisory lock — see the SQL function's header). That guarantee is proven
  // against a real Postgres instance instead, in tests/integration/playerRatings.test.ts.
});
