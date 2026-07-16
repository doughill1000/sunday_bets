---
name: design-review
description: Critique a shipped screen against docs/DESIGN.md — screenshot the real app at 390px dark, grade it screen-by-screen against the Hard-constraints checklist and the guide's principles, spot-check the light Parchment theme where colour decisions are in play, and produce a ranked findings scorecard. Use when Doug wants to "review the design", "critique the UI", "how does /stats hold up against DESIGN.md", or "grade this screen" — not for a design study (that proposes before/after mockups for a change not yet built) and not a product audit (value/on-brand fit, not pixels). No mockups, no redesign proposals — a finding that grows into a change belongs in design-study.
---

# Design review

A design review is a **critique of the shipped app**, not a proposal. It answers "does
this screen already meet the bar DESIGN.md sets?" by grading real screenshots against
the guide's Hard-constraints checklist and principles — no before/after, no mockups, no
named moves. It is the read-only, backward-looking twin of `design-study` (which
proposes a change before it's built) and shares its Step-1 capture harness.

Prototype of the pattern: the July 2026 mobile design review — screen-by-screen at
390px/dark, ranked findings (e.g. "leaderboard Total column clipped").

## Steps

1. **Capture the in-scope screens.** Reuse design-study's throwaway Playwright harness —
   copy `../design-study/references/capture.config.ts` to the repo root as
   `playwright.capture.config.ts` (if not already present) and
   `../design-study/references/capture.spec.template.ts` into
   `tests/capture/<scope>.capture.ts`, replacing `__SCRATCHPAD__` with this session's
   scratchpad path and trimming the screen list to the routes in scope. Do not duplicate
   these files into `design-review/references/` — point at design-study's copies.
   - Needs the local stack on the demo seed (`pnpm db:seed:demo`) and a dev server. The
     config's `reuseExistingServer` reuses a server already on **:5173** — but **:5173 is
     main-checkout only** (the dev-server-port-check rule); in a worktree, repoint the
     port in the config and `baseURL`, and ask before starting main's server.
   - Run `pnpm exec playwright test --config playwright.capture.config.ts`, then `Read`
     the PNGs from the scratchpad. The harness stays untracked — leave
     `playwright.capture.config.ts` and `tests/capture/` uncommitted.
2. **Read `docs/DESIGN.md` in full.** It is the rubric: the "Hard constraints" pre-merge
   checklist plus the per-section principles (navigation, disclosure, chip radiogroups,
   League/market copy, tokens, primary-action dominance, loading/empty/error/stale
   states, feedback ladder, AA contrast in both themes, motion). Note the app ships two
   themes — dark (default) and Parchment light (`users.theme_pref`, PR #573).
3. **Grade each captured screen, screen by screen.** For every screen, walk the Hard
   constraints checklist and the relevant principles, citing what the pixels _actually
   show_ — not what the code implies. A finding names: the screen, the violated
   constraint/principle, and the visual evidence ("the Total column clips at 390px on
   /league standings"). Don't grade code you didn't screenshot.
4. **Spot-check the light theme.** Where a screen makes a colour or contrast decision
   (not just reusing an existing token pairing), capture or toggle it in Parchment light
   and check AA — the checklist gates on both themes, and a dark-only review would miss a
   light-only regression. This is a targeted check, not a parallel full capture pass.
5. **Rank the findings by severity** (merge-gate violation > principle drift > polish
   nit) into a scorecard, one entry per finding: screen, constraint/principle, evidence,
   severity.
6. **Report.** Give Doug the ranked scorecard directly. Optionally write it to
   `docs/audits/YYYY-MM-DD-design-review.md` (read an existing file in `docs/audits/`
   first to match the format — header, scope/HEAD note, then the ranked list). Offer
   `issue-author` for findings worth fixing, and `design-study` for any finding whose fix
   needs a proposed redesign rather than a small correction. Read-only except the
   optional report file — no commits, no pushes, no GitHub writes.

## Remember

- **No mockups, no redesign proposals.** A review grades what exists; a finding that
  starts sketching a "before → after" has become a `design-study`, not a review.
- **Cite pixels, not code.** Every finding traces to a specific captured screenshot at a
  specific viewport/theme — don't infer a violation from source you didn't screenshot.
- **Dark is primary, light is spot-checked.** Full capture stays dark-first; light only
  gets pulled in where a screen makes its own colour/contrast call.
- **Grade against DESIGN.md, not taste.** A finding without a Hard-constraints or
  principle citation is an opinion — drop it or anchor it.
- **Read-only except the report.** Whether to commit the report, or act on any finding,
  is Doug's call.

## See also

- [`docs/DESIGN.md`](../../../docs/DESIGN.md) — the rubric (Hard constraints +
  principles), ADR-0030.
- [`docs/audits/2026-07-11-ui-consistency-audit.md`](../../../docs/audits/2026-07-11-ui-consistency-audit.md) —
  the standing drift-log baseline this review style feeds.
- Sibling skills: `design-study` (proposes before/after mockups for a change — shares
  the Step-1 capture harness, diverges after), `issue-author` (files findings worth
  fixing), `product-audit` (grades value/on-brand fit per surface, not visual pixels).
- Prior art: the July 2026 mobile design review (390px/dark, ranked findings) this skill
  formalizes.
