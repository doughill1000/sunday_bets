- **#619** Harden the credibility-rating rebuild — the upsert-and-prune that rebuilds
  `player_ratings` now runs as one atomic RPC serialized by a transaction-scoped advisory
  lock, closing the last concurrent-rebuild gap #622 only mitigated. The rebuild is also
  wired into every settlement-writing path that isn't a live grade (demo seed, prod-clone,
  historical import), and the one-shot `pnpm ratings:rebuild` entrypoint is simplified and
  proven end-to-end. files: `supabase/src/functions/_private/rebuild_player_ratings.sql` ·
  `src/lib/server/rating/rebuild.ts` · `scripts/rebuildRatings.ts` ·
  `supabase/scripts/{cloneDb,seed-demo/index}.ts` · ADR-0032 / ADR-0013
