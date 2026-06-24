---
name: db-pr-review
description: Review a database PR or branch whose diff touches supabase/ — scope the review to the SQL source, skip the generated supabase.ts and migration files, and verify RLS/grants/pgTAP coverage. Use when reviewing any change under supabase/.
---

# Database PR review

DB PRs run 500–5000+ lines because two large **generated** files appear in every diff.
Reviewing them line-by-line is wasted effort. Review the source that generated them.
Canonical guidance: `docs/agent-context/database.md` §"Reviewing a database PR".

## Steps

1. Scope the diff to the real review surface:
   ```sh
   git diff master...<branch> -- supabase/src supabase/tests supabase/.migration-hash.json
   ```
2. **Skip** these generated files (faithful representations — review the source):
   - `src/lib/types/supabase.ts` (often 4000+ lines; schema changes reformat union
     types). If it changed, just confirm the commit message says `pnpm db:types` ran.
   - `supabase/migrations/*.sql` (emitted DDL).
   - If the diff touches **only** those with no `supabase/src` change, it's a
     regen/reformat commit, not a logic change.
3. Review `supabase/src/**`: is the SQL correct and minimal? Does a new table have
   `enable row level security`, `grant`s, and a clear policy?
4. Review `supabase/tests/**`: is there a pgTAP test for every new policy/function?
5. Check `supabase/.migration-hash.json` looks freshly regenerated (not hand-edited).
6. Run the built-in `/code-review` on the non-generated surface for bug-level findings.

## See also

- `docs/agent-context/database.md` — full rule table and review checklist
- Sibling skill `db-migration` for producing a correct DB change.
