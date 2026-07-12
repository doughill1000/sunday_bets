---
name: db-migration
description: Make a Supabase schema change end-to-end — edit supabase/src, generate the migration, regenerate types, and add RLS/grants/pgTAP for new tables. Use whenever editing supabase/src/** (schemas, views, functions, policies, grants), generating migrations, regenerating supabase.ts, or working with the hash ledger.
---

# Database migration

Hash-ledger flow for any schema change. Canonical steps live in `README.md`; the
agent-facing rules in `docs/agent-context/database.md` and `AGENTS.md`
§"Conventions that bite". This skill is the command sequence — follow it in order.

## Steps

1. **Edit `supabase/src/**`only** —`schemas/`, `views/`, `functions/`, `policies/`,
   `grants/`. One primary object per file.
2. Generate the migration + update the ledger:
   `pnpm db:migration --name=describe_the_change`
   (Codex/Windows: `corepack pnpm db:migration --name=...`)
3. Verify the ledger is consistent: `pnpm db:migration:check`
4. Apply locally and regenerate types: `pnpm db:push:local`
   (runs `supabase db push --local` then `pnpm db:types` → rewrites
   `src/lib/types/supabase.ts`).
   > **Worktrees can't prod-clone.** `pnpm db:reset:local` (and `db:clone:*`) call
   > `supabase/scripts/cloneDb.ts`, which requires `SUPABASE_DB_URL_PROD` — a key
   > that lives in **no** committed `.env*`, so `new-worktree.ps1`'s blind `.env*`
   > copy never gives a worktree access to it. In a worktree, verify schema changes
   > with `db:push:local` (schema apply, no prod data) plus a pgTAP fixture; run any
   > prod-data count-check from the main checkout.
5. **New `public` table?** It needs all three or the Data/REST API can't see it:
   - `enable row level security`
   - ≥1 RLS policy (name documents the intended access pattern)
   - `grant` statements
   - a pgTAP test in `supabase/tests/` for every new policy/function.
6. If `supabase/src` or `src/lib/server/db` changed, run the DB test layers:
   `npx supabase test db` (pgTAP) and `pnpm test:integration`
   (both need Docker + local Supabase; check `npx supabase status`).
7. **Commit the source change, the generated migration, and the ledger together** in
   one atomic commit. (Pushing is pre-authorized — see `AGENTS.md`.)

## Never

- Hand-edit `supabase/migrations/**`, `supabase/.migration-hash.json`, or
  `src/lib/types/supabase.ts` — all generated.
- Rename or move files under `supabase/src/` — the generator treats a rename as a
  drop + new object and re-emits brand-new DDL, breaking idempotency.

## Conflicts / parallel work

Migration-ledger, generated-types, and shared SQL/RLS changes must be **serialized**
across branches. When a dependent branch rebases onto newer trunk, regenerate
artifacts from the combined state — never resolve a ledger conflict by taking one side
wholesale (`docs/WORKFLOW.md` §"Parallel-work rules").

## See also

- `README.md` — canonical hash-ledger walkthrough
- `docs/agent-context/database.md` — what to edit / never touch, DB PR review
- `AGENTS.md` §"Conventions that bite"
- Sibling skill `db-pr-review` for reviewing the resulting diff.
