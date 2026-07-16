---
name: design-study
description: When planning a new or reworked UI feature during issue creation, produce a "design study" artifact — screenshot the current screens for grounding, name the structural problems, propose a few named moves, and show before/after mobile mockups built from the app's REAL src/app.css .dark tokens so they read as real screens. Then tie it to the issue. Use when Doug wants to explore, mock, redesign, or visualize a UI feature before or while filing its issue — not for backend-only issues (no UI surface) and not for a pure critique of the shipped app (that's a design review, no mockups).
---

# Design study

A design study is a **visual proposal for a UI feature, made during issue planning**. It
turns "here's a feature idea" into an opinionated, before/after artifact that reads like
real screens — so the design argument is settled in pixels before the issue is written and
before anyone builds. It is the visual companion to `issue-author` / `scope-issue`.

Prototype of the pattern: the "Hotshot · Stats & League redesign study" artifact (a
single dark-skinned page — thesis hero, three named symptoms, four named moves with live
demos, before/after phone mockups at 390 px, seeding #514 / building on #502).

## When to run it

Trigger when Doug wants to **see** a UI idea before committing it to an issue: "mock this
up", "design study for #NNN", "explore the /stats redesign", "what could this screen look
like", "before/after for this feature". It slots between the idea and the Ready issue.

- **Not** for backend-only work with no user-facing surface.
- **Not** a plain critique of the _shipped_ app — that's a design **review** (screenshot +
  scorecard, no proposal). A study always ends in mockups of a _proposed_ change. The two
  share the capture harness (Step 1); they diverge after.

## What a good study contains

Match the prototype's spine — every part earns its place:

1. **A thesis, stated as the answer.** One opinionated sentence naming the core problem and
   the fix ("Lead with the answer, not the archive"). Not a neutral survey of options.
2. **A diagnosis** — 2–4 _named_ symptoms of the current screen, each grounded in what the
   Step-1 screenshots actually show (e.g. "right-hand columns clip off-screen at 390 px").
   Nothing is "broken"; the problem is structural.
3. **A few named moves** — the approach as 3–5 discrete, categorized moves (Navigation /
   Information architecture / Density / Encoding …). Each move has: a one-line name, a
   `from → to` transformation, a short rationale, and a **live inline demo** built from the
   app's real atoms (not a description of one). None of the moves is a rewrite.
4. **Before/after mockups** in mobile phone frames at **390 px**, using the app's exact
   skin so they read as real screens. "Before" ≈ today's layout; "After" ≈ the moves
   applied. Caption what moved.
5. **Issue ties** — name the issue(s) this seeds or builds on (`Seeds #514 · builds on
#502`), so the study feeds the backlog rather than floating free.
6. **(Optional) a roadmap** — if the study spans several issues, a short "ships in waves"
   footer.

## Steps

1. **Ground in the real app (the "before").** Capture the current relevant screens with the
   throwaway Playwright harness so the diagnosis and the "before" mockup are honest, not
   imagined.
   - Copy `references/capture.config.ts` to the repo root as `playwright.capture.config.ts`
     (if not already present) and copy `references/capture.spec.template.ts` into
     `tests/capture/<feature>.capture.ts`. In the spec, replace `__SCRATCHPAD__` with **this
     session's** scratchpad path and trim the screen list to the routes in scope.
   - Needs the local stack on the demo seed (`pnpm db:seed:demo`) and a dev server. The
     config uses `reuseExistingServer`, so a server already on **:5173** is reused. **:5173
     is main-checkout only** — in a worktree, change the port in the config **and** its
     `baseURL`, and ask before starting main's server (the dev-server-port-check rule).
   - Run: `pnpm exec playwright test --config playwright.capture.config.ts`. Then `Read` the
     PNGs from the scratchpad and let what you see drive the diagnosis.
   - The harness is a **throwaway** — it lives in the scratchpad-pointing spec and is not
     committed. Leave `playwright.capture.config.ts` and `tests/capture/` untracked.
2. **Read the governing guide, then pull the live tokens.** Read `docs/DESIGN.md` (the
   governing design guide, ADR-0030) — in particular its "Hard constraints" checklist —
   before proposing moves, so the study never proposes something the merge gate would
   reject. The token vocabulary itself lives in `docs/agent-context/design-system.md`
   (ADR-0029); don't invent a palette. The app ships **two** themes: `:root` carries the
   light **Parchment** theme, `.dark` carries the charcoal `--ink` + brass gold `--gold` +
   warm cream `--cream` (ember `--ember` accent) dark theme, and dark is the default for
   unauthenticated/unset visitors. The study's mockups use the **dark skin as primary** — sync
   the scaffold's token block from `src/app.css` `.dark`. If a token drifted since the
   scaffold was written, the live `src/app.css` value wins.
3. **Diagnose, then decide the moves.** From the screenshots, write the thesis and the named
   symptoms, then the 3–5 moves that answer them. Keep moves small and composable — the
   pitch is "none of these is a rewrite." Sanity-check each proposed move against the
   Hard-constraints checklist (from Step 2) as you go — including the "clears AA in both
   themes" line — so nothing later needs a redo.
4. **Build the study page.** Copy `references/mockup-scaffold.html` and fill it in: token
   block from Step 2, the narrative sections (hero / diagnosis / moves), and the before/after
   phone mockups assembled from the scaffold's app atoms (`.card`, `.meter`, `.chips`,
   `.delta`, `.disc`, `.mini-tiles`, `.diverge`, `table.mini`, `.tabbar`, …). Reuse the
   app's real tab bar, status bar, and component shapes so the mockups are indistinguishable
   from screenshots. 390 px-first; wide content scrolls inside its own container.
5. **Publish as an Artifact.** **Load the `artifact-design` skill first** (required before any
   Artifact), then `Artifact` the file. Title it `<App> · <feature> design study`; favicon a
   stable emoji (🎨). Send Doug the link.
6. **Tie it back to the issue.** Feed the study's conclusions into the issue's UX notes and
   acceptance criteria, and link the artifact URL from the issue body/comment. Hand off to
   `issue-author` (new issue) or `scope-issue` (existing issue). GitHub writes need Doug's
   go-ahead per `AGENTS.md`.

## Principles (what made the prototype land)

- **Real skin, not wireframe grey.** The mockups use the app's actual tokens and atoms, so
  the argument is about _this_ product, not a generic pattern.
- **Answer-first, opinionated.** Lead with the fix. A study takes a position; it is not a
  menu of equally-weighted options (that's what `scope-issue`'s interview is for).
- **Grounded in real screenshots.** The "before" is captured, not remembered — the diagnosis
  cites what the pixels actually do at 390 px.
- **Moves, not a rewrite.** Decompose the redesign into a few independently-shippable moves;
  it makes the issue splittable and the change reversible.
- **Dark-primary, light-checked.** Mockups render in dark — the app's default skin — so the
  study lives mostly in that world. But DESIGN.md requires every surface to read correctly
  under **both** themes, and the PR-template design checklist gates on AA contrast in both;
  any move that introduces a new colour or contrast decision (not just reusing an existing
  token pairing) gets sanity-checked against the light Parchment values in `:root` before the
  issue is filed. That's a check, not a second study — don't build full duplicate light
  mockups.

## Assets

- `references/mockup-scaffold.html` — the reusable study page: token block (sync from
  `src/app.css`), narrative chrome (hero / diagnosis / moves / roadmap), phone-frame +
  app-atom CSS, and a worked before/after example.
- `references/capture.config.ts` — session-agnostic Playwright config (390 px, dark, DSF 2,
  `reuseExistingServer`).
- `references/capture.spec.template.ts` — login + screenshot spec; set `__SCRATCHPAD__` and
  trim the route list.

## See also

- `docs/WORKFLOW.md` §"From idea to Ready" — where a study sits in the pipeline.
- `docs/DESIGN.md` — the governing design guide (ADR-0030), incl. the "Hard constraints"
  pre-merge checklist a study should pre-check against; token vocabulary lives in
  `docs/agent-context/design-system.md` (ADR-0029).
- Sibling skills: `issue-author` (files the issue the study feeds), `scope-issue` (interviews
  around the study), `new-adr` (if a UX decision is durable enough to need one), `design-review`
  (the critique-only twin — same capture harness, no mockups, grades the shipped screen instead
  of proposing one).
- Prior art: the July 2026 mobile design review (same capture harness, critique only, no
  mockups) and the #502 "Your edge" / #514 situational-drill-downs split the prototype seeded.
