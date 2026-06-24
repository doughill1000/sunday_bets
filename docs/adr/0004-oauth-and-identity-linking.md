# ADR-0004: Third-party (OAuth) sign-in and the single-identity / account-linking model

- Status: Accepted
- Date: 2026-06-24
- Issue: #105
- Supersedes: None

## Context

The app already has two sign-in methods, both cookie-based via `@supabase/ssr`
(`src/hooks.server.ts`):

- **Magic link** — `signInWithOtp()` from `src/routes/auth/+page.server.ts`, completed at
  `GET /auth/confirm` (`src/routes/auth/confirm/+server.ts`) which calls `verifyOtp()` and sets the
  session cookie.
- **Email + password** — `signInWithPassword()` in the same form action; already shipped (the work
  scoped by issue #105, which explicitly *excluded* OAuth).

Magic link costs an email round-trip on every sign-in, which is the main friction on mobile;
password reduces it but still requires typing credentials. For a ~6-person PWA installed on phones,
**one-tap third-party sign-in is the lowest-friction option**, especially on iOS. This ADR decides
how to add it.

Adding OAuth crosses the authentication/trust boundary and introduces a new *identity type*, so per
`docs/adr/README.md` it requires an ADR before implementation. The decision drivers are:

1. **Which providers** to support at launch.
2. **Account continuity** — every existing user currently signs in with a Gmail magic link. When
   they instead tap "Continue with Google" (or Apple), they must land in their *existing* account,
   not a duplicate. How identities collapse to one person is the core decision.
3. **Preserving the existing trust model** — sessions are **cookie-based** and must stay that way
   (localStorage breaks the iOS standalone PWA; see `docs/agent-context/auth.md`), and
   **admin = `public.users.role === 'admin'`** resolved in `injectSession` and mirrored by the
   `is_admin()` SQL function must remain correct for any sign-in method.
4. **The iOS standalone PWA redirect constraint** — OAuth is a redirect flow, and iOS standalone
   mode handles redirects and storage differently from a normal browser tab.

`supabase/config.toml` already reserves `…/auth/callback` in `additional_redirect_urls`, but **no
`/auth/callback` route exists** — OAuth needs one.

## Decision

### 1. Providers at launch: Google and Apple

Add Google and Apple as OAuth providers via `supabase.auth.signInWithOAuth({ provider })`. Google
covers Gmail (every current user); Apple covers the iOS-ecosystem friends and users who prefer
Apple's hide-my-email. Both are first-class Supabase Auth providers. Additional providers (e.g.
GitHub) are a later config + button addition using the same pattern and do **not** require a new
ADR — the identity model below governs all of them.

> **Implementation note (2026-06-24):** launch is scoped to **Google-only**; Apple is deferred. The
> paid Apple Developer account and its expiring-JWT client secret (rotation ops, see Consequences)
> are not worth it for the current group, and Google covers every existing user (all on Gmail).
> Apple is a later config + button add under this same identity model — no new ADR — exactly like
> the GitHub case above. Tracked on issue #134 (Google-only) with an Apple deferred follow-up note.

### 2. One person, one account, regardless of method

A person is a single `auth.users` row and a single `public.users` row, no matter how many sign-in
methods (magic link, password, Google, Apple) are attached to it. `public.users.id`
(`references auth.users(id)`) remains the one stable handle that all gameplay data
(`group_memberships`, `picks`, `pick_settlement`, the weekly weights table, `push_subscriptions`,
`notification_log`, audit `actor`) references. Admin resolution and RLS are unchanged: they key off
`user.id`, so they already work for any identity that resolves to the same `auth.users` row.

### 3. Server-side PKCE completion (keep the cookie session)

OAuth redirects back to a new `GET /auth/callback` route that calls
`exchangeCodeForSession(code)` on `event.locals.supabase`, which sets the **session cookie** — the
same server-side, cookie-based shape as the existing `/auth/confirm` OTP handler. There is **no**
client-side token handling or `localStorage` use. This preserves the permanent iOS-PWA constraint.

### 4. Account continuity via automatic identity linking

Rely on Supabase **automatic identity linking**: when a new OAuth identity carries a
**provider-verified email that matches** an existing confirmed user, Supabase links it to that
existing user. Google and Apple both return verified emails, so an existing magic-link/password user
who signs in with Google/Apple lands in their **existing** account — no duplicate row, no merge — in
the common case.

**Security constraint (load-bearing):** automatic linking by email is only safe when the email is
provider-verified. Email confirmation must remain required, and linking must never occur on an
unverified email — otherwise an attacker could pre-create an unverified identity for someone else's
address and hijack the account on first real sign-in. This constraint must be preserved in Supabase
Auth configuration and covered by a test.

### 5. Manual linking from a signed-in "sign-in methods" page

Provide a signed-in settings surface to manage methods: list current identities with
`getUserIdentities()`, connect a provider with `linkIdentity()`, and remove one with
`unlinkIdentity()`. Guard: refuse to unlink the **last remaining** sign-in method, which would
orphan the account.

### 6. Magic-link sign-in is deprecated after OAuth rollout

Once OAuth is live and current users have a one-tap path in (Google covers every existing Gmail
user; Apple and password cover the rest), **magic link is removed as a *sign-in option*** in favor
of **password + OAuth**. The `signInWithOtp` button and the `magic` branch of the method toggle on
`src/routes/auth/+page.svelte` are dropped.

This is a sequencing constraint, not a same-PR change: every current user signs in with a Gmail
magic link today, so removing it *before* OAuth ships would strand them. Order is therefore OAuth
ships (Issue A) → users confirmed able to sign in via Google/Apple/password → magic-link sign-in
removed (Issue D).

**The email-OTP path stays.** `verifyOtp` at `GET /auth/confirm` also backs **email confirmation on
signup** and **password reset** (a reset link is itself a one-time email link), and the verified-email
guarantee in decision 4 depends on confirmation remaining on. Deprecating magic link removes a
*sign-in method*, not the email/OTP subsystem.

### 7. Merging two already-distinct accounts is not self-serve initially

Automatic linking (decision 4) handles the realistic case. True **merge** — collapsing two separate
`auth.users` rows that have *each* already accumulated gameplay data — is treated as an
**admin-assisted, service-role operation, deferred behind a sizing spike** (see Consequences and the
follow-up issue). Self-serve merge is deliberately *not* built at launch; this is a recorded
tradeoff, not an omission. The realistic trigger (a user whose provider email differs from their
magic-link email, producing a duplicate) is expected to be rare for this group.

## Consequences

**Helpful:**

- One-tap sign-in removes the biggest mobile sign-in friction — the primary goal.
- Existing users keep a single account automatically; no manual migration for the common case.
- The identity model stays provider-independent: adding or swapping providers later does not
  threaten to duplicate accounts or orphan gameplay data, and the admin/RLS boundary is untouched.

**Harmful / costs:**

- **iOS standalone PWA redirect round-trip.** OAuth bounces to the provider and back; iOS may open
  the provider in Safari and return the user to the installed PWA. The session must persist via the
  server-set **cookie** so reopening the PWA is authenticated. This is the OAuth analog of the
  localStorage caveat and **must be verified on a real iOS device**, not just desktop.
- **Apple is operationally heavier than Google.** Apple requires an Apple Developer account, a
  Services ID, a signing key, and domain/return-URL verification, and its client secret is a **JWT
  that expires (≤6 months) and must be rotated** — an ongoing ops task. Google needs only an OAuth
  client ID/secret plus a consent screen. Both providers' secrets are configured in the Supabase
  dashboard **per project** (staging and prod), never committed to the repo.
- **Automatic linking depends on verified emails.** Misconfiguring it (linking on an unverified
  email) turns it into an account-takeover vector — hence the explicit constraint in decision 4.
- **Duplicate accounts remain possible** in edge cases (e.g. a provider email that differs from the
  user's magic-link email). Resolving those requires the deferred admin merge, which is irreversible
  and must re-point `user_id` across every gameplay table while resolving composite-key conflicts —
  high effort and easy to corrupt leaderboards if rushed. Hence it is sized by a spike before any
  commitment.

## Alternatives considered

- **Client-side OAuth (implicit flow / `detectSessionInUrl`, tokens in `localStorage`).** Rejected:
  breaks the cookie-session invariant that keeps the iOS standalone PWA logged in.
- **Self-serve account merge at launch.** Rejected for now: high effort and data-loss risk for a
  six-person app, while automatic linking already handles the real case. Revisited only if
  duplicates actually occur (the spike).
- **Google only.** Viable and simpler, but Apple is cheap to include in the same identity model and
  valuable for iOS users; recorded as the chosen pair. GitHub was considered and left as a trivial
  later add-on.
- **A separate ADR per provider or per concern.** Unnecessary: one identity model governs all
  sign-in methods, so one ADR suffices and additional providers are config changes under it.
- **Keeping magic link as a permanent third sign-in option.** Rejected (decision 6): once OAuth is
  live it adds little over password + OAuth, while leaving two near-identical email-link UXs (magic
  link and password reset) to maintain and test. Removing it is deferred until after OAuth rollout
  so current Gmail magic-link users are never stranded, and the email-OTP path is kept for
  confirmation and reset regardless.

## Follow-up

Implementation is phased into separate Ready issues (one branch/worktree/PR each), gated on this ADR
being Accepted:

- **Issue A — OAuth sign-in (Google + Apple):** new `GET /auth/callback` route doing
  `exchangeCodeForSession` (mirrors `src/routes/auth/confirm/+server.ts`); "Continue with
  Google/Apple" buttons on `src/routes/auth/+page.svelte`; provider config in `supabase/config.toml`
  plus dashboard secrets for staging and prod (a manual operator step); `additional_redirect_urls`
  for prod/preview origins; e2e + integration; real-iOS-device verification of the standalone-PWA
  round-trip.
- **Issue B — Manage sign-in methods:** signed-in settings UI over `getUserIdentities()`,
  `linkIdentity()`, `unlinkIdentity()`, with the last-method guard. Depends on A.
- **Issue D — Deprecate magic-link sign-in (decision 6):** remove the `signInWithOtp` button and the
  `magic` branch of the method toggle on `src/routes/auth/+page.svelte`, leaving password + OAuth.
  The email-OTP path (`/auth/confirm`) is retained for signup confirmation and password reset.
  Depends on A and on confirming current users can sign in via Google/Apple/password.
- **Issue C — Account-merge spike (LoE) + optional admin merge tool:** time-boxed sizing of the
  service-role merge (re-point `user_id` across `group_memberships`, `picks`, `pick_settlement`, the
  weekly weights table, `push_subscriptions`, `notification_log`, audit `actor`, then delete the
  loser `auth.users` row, resolving composite-key conflicts), then a build/skip decision.

Any DB changes (e.g. an eventual merge tool) serialize the migration-ledger, the generated
`src/lib/types/supabase.ts`, and grant/RLS edits against other in-flight DB work per
`docs/WORKFLOW.md`. Revisit this decision if duplicate accounts recur (promote the merge tool) or if
a provider's verified-email guarantees change (which would weaken automatic linking).
