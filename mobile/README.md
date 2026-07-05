# Sunday Bets — mobile (Expo / React Native)

Native companion app for the Sunday Bets NFL pick'em league. Expo SDK 57 +
expo-router + TypeScript, talking **directly to Supabase** with the same
row-level-security rules that protect the web app — there is no mobile backend.

## What it does

- **Sign in** with an existing Sunday Bets email/password account (Supabase Auth,
  session persisted in AsyncStorage).
- **Picks board** for the active week: spreads per game, team + weight selection
  (Low 1 / Medium 3 / High 5 / All-In 10), auto-save with the web app's debounce
  semantics, the one-All-In-per-week confirm/move flow, kickoff locking, revealed
  group picks after kickoff, final scores and graded win/loss/push results.
- **Standings**: season leaderboard with W-L-P records, missed picks and the
  drop-worst-week rule (ADR-0018), computed on-device from `pick_settlement`
  (see the note below), with a season picker for imported historical seasons.
- **Group**: roster with commissioner badges; switch between groups when you
  belong to more than one (mirrors the web's active-group cookie, stored in
  AsyncStorage).
- **Profile**: avatar, name, admin badge, environment + version info, sign out.

Saves go through the same `lock_pick_all_groups` / `unlock_pick_all_groups`
RPCs the web app calls, so every rule that matters (kickoff cutoff, line
snapshotting, All-In uniqueness) is still enforced by Postgres, not the client.

## Why the leaderboard is computed client-side

The web leaderboard reads the `leaderboard_season_totals` materialized view
through a service-role-only RPC (ADR-0002: the matview holds every group's rows
and carries no RLS). A direct-to-Supabase client can't touch it, so this app
aggregates the group's own RLS-visible `pick_settlement` rows with logic that
mirrors the matview SQL (`src/domain/leaderboard.ts`). If the scoring SQL
changes, update that file (and `src/domain/scoring.ts`) to match.

## Running it

```sh
cd mobile
pnpm install          # pnpm only — .npmrc pins node-linker=hoisted for Metro
cp .env.example .env  # then fill in real values (see below)
pnpm start            # Expo dev server → press a for Android, i for iOS, w for web
```

Scan the QR code with Expo Go (or run a dev build) to open it on a phone.

### Environment

`mobile/.env` needs the Supabase URL + publishable (anon) key:

- **Staging** (default): copy `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`
  from the repo root `.env.staging` into the `EXPO_PUBLIC_*` names.
- **Production**: same, from `.env.production`.
- **Local stack**: `http://127.0.0.1:54321` only works in a simulator on the same
  machine; for a real device substitute your LAN IP.

`.env` is gitignored (repo root rules); `.env.example` is tracked.

### Keeping generated DB types in sync

`src/types/supabase.ts` is a copy of the repo's generated types. After a schema
change (`pnpm db:types` at the repo root), run:

```sh
pnpm sync:types
```

### Checks

```sh
pnpm typecheck   # tsc --noEmit
pnpm lint        # expo lint
npx expo export  # verifies the app bundles
```

## Deliberate scope cuts (v0)

- **No sign-up / password reset / Google OAuth** — account management stays on
  the web app (OAuth would need deep-link plumbing).
- **No invite redemption** — users must already be in a group; joining happens
  on the web.
- **Profile is read-only** — the `users` table has no client UPDATE grant
  (web edits go through a service-role endpoint), so name/avatar editing stays
  on the web app.
- **No admin tools, push notifications, comments/reactions, weekly recap, stats
  or Wrapped** — web-only for now. Comments/reactions are the most natural next
  addition (their tables are already RLS-writable by members).
- `finalWeekUnlimitedAllin` is assumed true (the `settings` row is admin-only
  under RLS); the save RPC re-checks the real value server-side.

## Layout

```
src/
  app/            expo-router routes (sign-in, (tabs)/{index,leaderboard,group,profile})
  components/     game card, team/weight selectors, summary bar, avatar, shared states
  domain/         pure ports of the web app's rules/scoring/spread/leaderboard logic
  lib/            supabase client, session + active-group providers, queries, picks board
  types/          generated Supabase types (copied — see sync:types)
```
