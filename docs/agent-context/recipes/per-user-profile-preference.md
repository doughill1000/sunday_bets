# Recipe: a per-user profile preference

An ordered checklist for adding a **per-user setting stored on `public.users`** that rides
the cached auth-context profile — the pattern behind `avatar_key`, `display_name`,
`guide_seen_at`, and `show_team_trends` (issue #406 PR 2). Use it for a preference the app
shell and any page can read cheaply on every request. Each step links the owning pack; this
is the sequence, not a restatement.

## When to use

- A small per-user flag or value the UI needs broadly and often (a toggle, a display name, a
  "seen this once" timestamp). It reads off `locals.userProfile` with no extra query.
- **Not** for bulky/rarely-read data (put that behind its own query) or for group-scoped
  settings (those belong on the group, not the user).

## The five touchpoints (in order)

1. **Column** — `supabase/src/schemas/NNNN_<name>.sql`:
   `alter table public.users add column if not exists <name> <type> [not null default …];`
   A non-null default backfills existing rows, so the preference is live for current users
   immediately. Then generate + apply: `pnpm db:migration --name=…` → `db:migration:check` →
   `db:push:local`. → [database.md](../database.md) and the
   [db-migration skill](../../../.claude/skills/db-migration/SKILL.md) (incl. the worktree
   prod-clone caveat).
2. **Auth context read** — `src/hooks.server.ts`: add the column to the `users` profile
   `.select(...)` and map it into `event.locals.userProfile`. This is the cached read path
   ([ADR-0014](../../adr/0014-auth-context-caching.md)); see [auth.md](../auth.md).
3. **Type** — `src/app.d.ts`: add the field to the `userProfile` shape on `App.Locals`
   (its default when the profile row is missing should match the column default).
4. **Write path** — `src/routes/(app)/api/profile/+server.ts` (`PUT`): accept the field,
   validate it, `update` `public.users`, and keep the existing `invalidateAuthContext(userId)`
   call so the cached profile is busted and the change shows immediately (ADR-0014).
5. **UI** — `src/routes/(app)/settings/+page.svelte`: a control (checkbox/input) initialized
   from `data.userProfile?.<field>`, `PUT`ing `/api/profile` on change, then `invalidateAll()`
   to refresh the cached profile across the app. (`bind:` updates the `$state` before the
   change handler runs, so the handler sees the new value.)

## Reading it

- **Server:** `event.locals.userProfile?.<field>` in any load or endpoint (see the picks
  load gating the ATS nugget on `showTeamTrends`).
- **Client:** `data.userProfile?.<field>`, threaded from the root layout.

## Reference implementations

`avatar_key` / `display_name` / `guide_seen_at` (the established trio) and `show_team_trends`
(issue #406 PR 2 — a boolean toggle end-to-end).
