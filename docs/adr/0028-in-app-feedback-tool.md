# ADR-0028: In-app feedback capture — store-first model, admin-gated GitHub egress, and public-repo context privacy

- Status: Accepted
- Date: 2026-07-10
- Issue: #500
- Supersedes: None

## Context

We are about to market Hotshot to friends and a small beta audience. The single
biggest determinant of whether non-technical friends actually report problems is
friction: any path that requires leaving the app, logging into GitHub, or filling a
structured template will not get used. Issue #500 ships the low-friction capture path —
one tap, one text box, instant acknowledgment, no GitHub account — and gives the
operator a triage inbox instead of reports scattered across texts and DMs.

Most of #500 is ordinary implementation, but three parts each independently trip the
`docs/adr/README.md` trigger test and are decided once here rather than rediscovered
per feature:

1. **A new persistent data model** (`feedback`) — captured submissions and their status.
2. **A new server-side egress / trust boundary** — a GitHub credential that files issues
   from **user-submitted content** into a repository. `doughill1000/sunday_bets` is a
   **public** repo, so anything filed — the user's free text _and_ any context attached —
   becomes world-readable. There is no prior GitHub-token or Octokit usage in the app to
   lean on; this is genuinely new egress infrastructure.
3. **The privacy / retention posture of client-side context capture** — what technical
   detail we collect about a user alongside their submission, where it lives, and how
   long we keep it.

RLS/grant mechanics are governed by ADR-0011 (closed-by-default baseline) and are not
re-derived here; group tenancy is governed by ADR-0002, from which this feature
deliberately departs (see Decision 2). The capture path reuses infrastructure already
in production: Sentry is wired client-side (`hooks.client.ts`), `__BUILD_ID__` (the
Vercel commit SHA) is a compile-time define (`vite.config.ts`), and the `ui/sheet` +
`ui/sonner` primitives already exist. **No LLM is on this path** — capture quality comes
from auto-captured context, not an AI interview; AI triage is a deliberate, separate,
future decision (see Alternatives).

## Decision

Ship a **store-first** feedback tool with an **admin-gated, human-in-the-loop** path to
GitHub. Boundaries future work must preserve:

1. **Store-first capture.** A submission writes exactly one `feedback` row first;
   filing to GitHub is a separate step. Capture therefore never depends on GitHub being
   reachable or the operator being online, and not every submission has to become an
   issue (duplicates, "love it" reactions, noise stay in the inbox). `POST /api/feedback`
   invokes **no LLM** and keeps an **app-agnostic** request shape, so the Expo app can
   POST to the same endpoint later with no server change and no mobile UI in this scope.

2. **User-scoped, not group-scoped — a deliberate departure from ADR-0002.** A feedback
   row is owned by the **submitting user** and visible to that user **and the global
   admin** — it is not a group-tenant resource. RLS/grants are a straight application of
   the ADR-0011 closed-by-default baseline: owner may INSERT and SELECT only their own
   rows; a non-admin cannot read another user's rows; the admin may SELECT and UPDATE
   all; anon is denied — covered by pgTAP. `context` is stored as `jsonb` (app-agnostic
   and evolving); `status` is a checked enum (`new → triaged → filed | dismissed`).

3. **GitHub egress via a fine-grained PAT, admin-gated and human-in-the-loop.** Filing
   runs **server-side only** (the `/admin/feedback` server action, gated by
   `locals.isAdmin`), using a **fine-grained PAT scoped to _Issues: write_ on
   `doughill1000/sunday_bets` only**, supplied as an env var (`GITHUB_FEEDBACK_TOKEN`)
   and **never exposed client-side**. Filing is **never automated from capture** — the
   operator reviews each item in the queue and clicks to file. On success the created
   issue URL persists to `feedback.github_issue_url` and status advances to `filed`.

4. **User content is sanitized before it becomes a public issue.** Because the repo is
   public, filing egresses user-authored text to a world-readable surface. The compose
   step **fences the body in a code block, neutralizes `@mentions`/`#refs`** (so filing
   cannot ping strangers or accidentally cross-link), and **caps length**. This guards
   against accidental pings and formatting injection — not against the operator, who is
   trusted and reviews each item first.

5. **Filed issues carry a `source:feedback` label (provisioned once).** Every issue
   filed from the queue gets the `source:feedback` label — namespaced to match the repo's
   existing `type:*` / `semver:*` convention — so feedback-originated issues are
   filterable (`is:issue label:source:feedback`) and the deferred "you asked, we shipped"
   surface has a clean query to build on. The label is created once as setup with a
   defined color/description; a `kind → type:*` suggestion (Bug → `type:bug`, Idea →
   `type:feature`) is an operator convenience the queue may pre-fill, but `source:feedback`
   is the only **guaranteed** label.

6. **Public-repo privacy split for captured context.** The full `context` blob — route,
   user id, `__BUILD_ID__`, viewport, user agent, latest Sentry event id, season/week,
   active group — is stored in the **private DB** and readable by its submitter. Only a
   curated, **non-identifying subset** (route, build id, kind, viewport/UA) may cross into
   a **public** issue; the **user-id UUID, the Sentry event id / session-replay link, and
   any PII stay in the DB and never enter the public issue**. Request **IP is not stored**.
   One line of honest in-sheet microcopy discloses that technical details are attached.

7. **Graceful degradation, never a hard fail.** If the PAT is missing or expired,
   "File to GitHub" degrades to a **prefilled new-issue URL** the operator opens in their
   own GitHub session and pastes back — filing never hard-fails, and the feedback is
   already safely stored regardless. Submitting while offline surfaces a graceful error
   and does not crash the app.

8. **Retention.** Feedback rows persist (they are the operator's inbox). On user
   deletion, `user_id` is **set null** — keeping a report that may already be filed to
   GitHub while dropping attribution — rather than cascaded away.

## Consequences

**Helpful:**

- Capture is decoupled from triage: the low-friction path can't be broken by GitHub
  outages, an offline operator, or a filing failure, and the operator gets a clean inbox
  instead of scattered DMs.
- The public egress is under tight, reviewable control — server-side, admin-only,
  human-in-the-loop, single-repo token, sanitized content, curated context — so
  user-submitted text can't silently ping strangers or leak identifiers onto a
  world-readable surface.
- The endpoint stays cheap, fast, offline-tolerant, and app-agnostic (no LLM, no
  provider cost, reusable by the RN app), and reuses Sentry / `__BUILD_ID__` / `ui/sheet`
  already in production.
- `source:feedback` makes filed items filterable now and seeds the future
  "you asked, we shipped" surface for free.

**Costs / harmful:**

- A **new secret to provision and rotate**: fine-grained PATs expire (≤ 366 days) and
  ride on the operator's personal account — a standing operational obligation (tracked in
  launch-readiness). The degradation path (Decision 7) bounds the blast radius of an
  expired token but does not remove the rotation duty.
- **Sanitization is load-bearing, not cosmetic** — because content auto-egresses to a
  public issue on click, the fence/mention-neutralize/length-cap step is a real security
  control that must be tested, not a nicety.
- A curated context subset for public issues means the operator sees richer detail in the
  private queue than the filed issue carries; that split must be maintained deliberately.

**Migration:** the `feedback` table goes through the hash-ledger flow + regenerated
`src/lib/types/supabase.ts`, serialized per the DB rules, with grants extended in
`supabase/src/grants/` and a new pgTAP RLS matrix — **done in the #500 implementation
PRs, not here.**

## Alternatives considered

- **Prefilled-URL-only, no server token.** Lighter — no secret to manage and no server
  egress boundary at all (the operator's own browser session files the issue, content
  visible before it posts). Rejected as the _primary_ mechanism because it is two clicks,
  not the one-click file the outcome calls for; **adopted instead as the degradation path**
  when the token is absent or expired (Decision 7).
- **GitHub App instead of a fine-grained PAT.** Not bound to a personal account and no
  ~1-year expiry, but materially more setup for a single operator filing to a single repo.
  Rejected as overkill for this scope; revisit if filing ever spans operators or repos.
- **Group-scoped feedback (the ADR-0002 default).** Rejected: feedback is a
  user→operator channel, not group content; the whole point is global-admin visibility
  across all submitters, which group tenancy would fight.
- **Auto-file on submit / AI triage on the hot path.** Rejected for this scope:
  store-first + human-in-the-loop keeps a public egress under operator control and keeps
  the endpoint cheap and offline-tolerant. AI classification, dedupe, and auto-drafting
  are a separate future decision, deliberately excluded so they can't be bolted onto the
  capture path without their own review.
- **Dump the full `context` into the filed issue.** Rejected given a public repo: the
  user-id UUID, Sentry link, and any PII would become world-readable for no operator
  benefit over the curated subset plus the private queue.

## Follow-up

- **#500 implementation** — a natural 2-PR seam: (1) DB — `feedback` table + RLS/grants +
  pgTAP + regenerated types (serialized per the hash ledger), then the capture path
  (endpoint + context util + `FeedbackWidget`); (2) the `/admin/feedback` review queue +
  GitHub filing. Capture (1) is independently shippable — feedback is stored and the
  operator can read the table directly — with the admin queue as a fast follow.
- **External setup:** provision `GITHUB_FEEDBACK_TOKEN` (fine-grained PAT, _Issues: write_,
  this repo only) in Vercel and add the key to `.env.example`; create the `source:feedback`
  label once. Add PAT rotation to the launch-readiness ops checklist.
- **Beta affordance (#500 scope, not this ADR):** a subtle "Beta" tag near the wordmark
  that opens the same feedback sheet — an invitation to report, not a quality disclaimer,
  kept well away from scores, standings, and dollar figures, and config-gated so it flips
  off in one change at the public launch.
- **Deferred to future issues:** any AI (classification, dedupe, auto-draft, auto-file),
  screenshot/annotation capture, close-the-loop notifications to reporters, the Expo
  shake-to-report UI, and a public "you asked, we shipped" changelog surface.
- The number **ADR-0028 is provisional** per the assign-at-merge rule; if another branch
  lands 0028 first, this rebases and renumbers at merge.
