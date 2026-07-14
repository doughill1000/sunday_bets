# Auth context pack

> Summary in `AGENTS.md` § "Auth & admin". This pack owns the deep-reference.

## Session model

Sessions are **cookie-based** via `@supabase/ssr`, wired in `src/hooks.server.ts`.
Every server route and endpoint receives `event.locals` which carries:

- `event.locals.supabase` — the per-request Supabase client (anon key + user cookie)
- `event.locals.session` — the decoded JWT, or `null` if unauthenticated
- `event.locals.user` — the user derived from the **locally verified** JWT claims, or `null`
- `event.locals.isAdmin` — `true` when `users.role === 'admin'`

`safeGetSession()` establishes `session`/`user` by verifying the access token's
**signature + expiry locally** via `supabase.auth.getClaims()` — no per-request
`getUser()` round-trip to the auth server on the happy path (**ADR-0031**, issue #588;
implemented in `src/lib/server/auth-session.ts`). With asymmetric signing keys enabled
it verifies against a cached JWKS; on a still-HS256 project it transparently falls back
to `getUser()`. It stays fail-closed: a bad signature, expired token, or unresolvable
`kid` yields `{ session: null, user: null }`. Operating the keys/TTL/rotation is
`docs/runbooks/auth-jwt-verification.md`. RLS remains the real authorization regardless
(Postgres re-validates the JWT on every user-scoped query).

Do **not** use `localStorage` for session storage. The iOS standalone PWA relaunches
in a fresh context that has no access to `localStorage`, which silently logs users out.
Cookies survive relaunches; `localStorage` does not. This constraint is permanent —
don't refactor away from `@supabase/ssr` without revisiting it.

## Client tiers

| Client                        | Key          | Bypasses RLS?    | Where                               |
| ----------------------------- | ------------ | ---------------- | ----------------------------------- |
| `event.locals.supabase`       | anon         | No — RLS applies | Server routes, form actions         |
| `src/lib/supabase/service.ts` | service-role | **Yes**          | Server-only; never expose to client |

The service-role client is for admin operations that must bypass RLS (e.g., grading
all picks regardless of ownership). Import it only in `src/lib/server/**` — never in
a `+page.svelte` or any client-facing module.

## Admin boundary

`Admin = public.users.role === 'admin'` — this is the single source of truth.

Two things enforce it in sync:

1. `hooks.server.ts` sets `event.locals.isAdmin` by reading the `users` table.
2. The `is_admin()` SQL function used in RLS policies checks the same column.

Never check admin status against `auth.users.user_metadata` or any other field —
only `public.users.role`. To verify: `select is_admin()` in a Supabase SQL editor
while authenticated as the user under test.

**`role` answers "can this person do admin things," not "is this person in the league."**
Never reuse it as a population filter in a grading/scoring/participation query — an admin
is still a competing league member. See [database.md](database.md) "Read the assembled
table shape" for the two prod defects this has already caused; population always comes
from `group_memberships`.

## PWA considerations

The app is installed as a PWA on iOS and Android via `vite-plugin-pwa`. Key points:

- iOS standalone mode: `localStorage`, `sessionStorage`, and `IndexedDB` are scoped
  to the PWA's origin but survive only while the app is foregrounded. On relaunch
  they may be cleared — cookies are the only reliable persistence on iOS Safari PWA.
- Push notification work is deferred; when it begins, consult the service worker
  (`src/service-worker.ts`) and the PWA manifest (`src/manifest.webmanifest`).

## Validation for changes here

```sh
# Auth integration tests (requires Docker + local Supabase running)
pnpm test:integration -- --testPathPattern=auth

# Check is_admin() with a real user
npx supabase db reset  # fresh local state
# then test RLS policies
npx supabase test db
```
