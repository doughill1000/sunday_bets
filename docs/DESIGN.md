# Design principles

The living design guide for Hotshot's UI. It exists so the same 390px decisions stop
being re-litigated one PR at a time — and so a new surface conforms to the patterns
already in the app instead of re-deriving (and drifting into) its own.

**This is the interaction layer.** The token _vocabulary_ every surface draws from —
colour, typography, spacing, elevation, motion, and the "reach for a token, never a raw
scale or inline hex" rule (enforced by `scripts/check-brand-colors.ts` in lint + CI) —
lives in [`docs/agent-context/design-system.md`](agent-context/design-system.md)
([ADR-0029](adr/0029-design-system-token-architecture.md)). This guide is about how those
tokens and atoms **compose into mobile screens**: layout, patterns, action, state.

Audience: humans and agents building or reviewing any user-facing screen. The standing
decision this guide details is ratified in
[ADR-0030](adr/0030-mobile-first-design-principles.md); the `design-study` and
`design-review` skills operationalise it.

## The stance

- **The mobile decision is the default decision.** Design the 390px phone first; a desktop
  divergence must name the **user, task, and viewport** that justify it. "What specific
  desktop task requires this to differ?" is a fair review question. The one surface where
  desktop earns real attention is **admin**, operated on a laptop.
- **Two themes, dark by default.** The app ships a dark theme (charcoal `--background` +
  brass-gold `--primary` + warm cream `--foreground`, ember `--ember` accent — see
  [ADR-0027](adr/0027-rebrand-sunday-bets-to-hotshot.md)) and a light **Parchment** theme
  (warm paper ground, brass as co-lead), chosen per user in Settings and stored on
  `users.theme_pref` (#532); dark is the default for unauthenticated/unset visitors. Design
  for **both** — every colour and elevation token carries a maintained value in each theme
  (`.dark` and `:root` in `src/app.css`), so a new surface must read correctly under either.
  The accent splits into a **fill** (`--primary`, keeps a dark label) and an **ink**
  (`--primary-ink`, darker on light to clear AA): reach for `text-primary-ink` for a gold
  label/border, never `text-primary`.
- **Token-driven** — every colour, and semantic type/spacing/elevation/motion, comes from
  the vocabulary in [`design-system.md`](agent-context/design-system.md), not a raw value.
  That layer owns the "what"; this guide owns the "how it's arranged".
- **Confident, with signature moments.** Quiet premium by default: charcoal and gold, the
  data leads, motion is sparing. A **signature treatment marks an event, accomplishment, or
  consequential transition** — All-In, The Whale, a live streak, an award. It does not
  decorate routine navigation, ordinary selections, empty states, or every successful save;
  that restraint is what keeps `--ember` and the slower motion tokens meaningful. The
  group-chat swagger lives mainly in the **copy** (the Commissioner's voice), not the
  furniture.

## Principles

Each principle is a rule, a reason, and a real example from this app. They group loosely
into **layout & hierarchy** (1–4, 15), **action & flow** (5–8), **state & resilience**
(9–13), and **voice & access** (14, 16).

### 1. 390px is the canvas, not a breakpoint

Lay every screen out for a 390px-wide phone first and make sure **nothing clips
horizontally** there. Wide content (tables, long labels, charts) scrolls inside its own
container; the page body never scrolls sideways.

_Why:_ desktop-down design silently pushes the rightmost column off a phone screen.
_Example:_ the standings "Total" column once clipped off the right edge at 390px; the League
home standings keep it on-screen by dropping the record's own column and tucking W-L-P onto a
muted line under each name, and by carrying rank movement inside the existing "#" cell rather
than adding a column. The same class of clip drove the `/market` picker consolidation (#529).

### 2. One pattern per job

A given interaction should look the same everywhere it appears. To **switch between cuts
of the same data, use the chip radiogroup** — the selector used by `/stats` "Every split"
and its Breakdowns. Don't introduce a second control (tabs, an accordion) for the same
"show me one cut" job. (`/market`'s #529 slice explorer was this pattern's other canonical
home until #692 retired the slices themselves.)

The boundary with Tabs (ratified after the 2026-07-11 audit): the chip radiogroup
switches cuts **within a section**; **Tabs** may split a **whole page** into two or three
top-level views (`/league` Standings · Honors · Week, `/wrapped` Your Year · The League).
The test: if the switch re-renders one panel inside a scrolling page, it's chips; if it
changes what the entire page is, it's Tabs. Never both on one screen for sibling jobs.

> **Decision note (2026-07-22, #741).** `/league` spends the third tab slot on **Honors**
> — the trophy room — superseding #631's two-tab containment. #631 was right to contain
> recap sprawl and to write the one-control-per-tab rule (both survive unchanged), but it
> filed the league's emotional payoff as a scope-gated appendix of the standings panel;
> #737 made the honors visible by ordering, and living with it confirmed they deserved an
> address, not a scroll position. ADR-0035's lane law is now the tab boundary: the market
> lane (table, ladder, race) is Standings; the room lane (champion, spoon, titles, shelf)
> is Honors. Binding conditions: Standings stays the year-round default tab (the honors
> strip is the one seasonal first-paint mechanism), each tab keeps exactly one control,
> and the three-view maximum is now fully spent — a fourth `/league` view requires a new
> design study and a revision of this note.

_Why:_ two controls for one job doubles what a user has to learn and invites drift.
_Example:_ the `/stats` breakdowns switch cuts with the **same** chip radiogroup as the
situational explorer directly above them — #538 replaced an accordion that had been doing
that one job a second way (and extracted the shared `ChipRadiogroup` in the process).

### 3. Progressive disclosure, at most one level deep

Collapse secondary content behind **one** tap. Never nest a disclosure inside a
disclosure — a drawer-in-a-drawer means two taps to reach content and reads as a plumbing
accident, not a design.

_Why:_ each extra tap buries content and each nesting level compounds it.
_Example:_ the picks page collapses committed picks behind a single "_N_ committed picks"
disclosure — one tap, one level. The `/stats` breakdowns once nested "Accuracy by team"
inside a "More breakdowns" drawer (two taps before anything rendered); #538 flattened that
to a chip radiogroup, so no drawer-in-a-drawer ships today.

### 4. Answer first, archive last

Lead a screen with the synthesis — the takeaway, the one number, the edge — and push raw
tables down behind disclosure. But don't over-rotate: burying the archive under a second
near-identical synthesis card is its own failure (see principle 2's example).

_Why:_ a phone shows one thing at a time; the first thing should be the point.
_Example:_ `/stats` leads with one scope-aware hero — the headline number line (record ·
ATS% · decisions) paired with the signature tells — before the "Every split" explorer and
the per-team/per-weight tables. #567 folded three stacked preamble cards into that single
hero, the fix for the over-rotation this principle warns against; the #518 density pass and
#514 "Every split" set the direction.

### 5. Encode state in form, not just text

Make state legible at a glance through shape and colour — a meter, a pill, a severity
stripe — not through a number alone. Keep the four meanings that tend to collapse into "a
gold thing" **visually distinct**: _selected_ (chosen), _actionable_ (pressable),
_primary_ (the preferred next action), and _status_ (success / warning / live / locked).

_Why:_ on a small screen a glance beats a read; an invisible state is a broken state.
_Example done right:_ the picks selection-tier ladder (cream → charcoal → brass → ember,
codified in [`design-system.md`](agent-context/design-system.md)) — a disabled "Lock in"
is deliberately flat/muted, never a dimmed brass, so it never reads as "kind of active".
Cover rates get the same treatment: a `meter` bar with a 50% tick, not a table cell.

### 6. One clear next action

Every task-oriented screen makes the likely next action visually obvious; secondary
actions must not compete with it, and repeated actions stay near the content they affect.
This is action hierarchy — distinct from principle 4's information hierarchy.

_Why:_ a phone exposes only a slice of the workflow; when several actions read as equal,
the user has to reconstruct the screen's intent.
_Example:_ on the picks board, choosing team and weight is supporting work — **Lock in** is
the consequential action and must stay the loudest element (the ladder in
`design-system.md`).

### 7. Keep consequential actions in reach

Place frequent and primary actions within comfortable thumb reach — usually the lower
viewport — and don't make the user travel between content at the bottom and controls at the
top. A sticky action bar is right when the action applies to the whole screen, the user may
scroll before completing it, and the bar doesn't obscure required content.

_Why:_ mobile-first is about how the device is _held_, not only how wide it is.
_Example:_ the `/stats` context bar sticks under the header so the player/scope selectors
never scroll away; a long picks slate keeps its lock-in reachable rather than header-bound.

### 8. Preserve context through every transition

A drawer, dialog, drill-down, or navigation must make clear what the user opened, what
changed, and how to get back. Prefer an anchored overlay or inline expansion over replacing
the whole screen when that better preserves the originating context.

_Why:_ mobile transitions disorient because the previous screen is gone from view.
_Example:_ opening a player's situational split retains the selected week / league / filter
rather than dumping the user back to an unfiltered default on close.

### 9. Design for interruption and recovery

Assume the user may switch apps, lock the phone, lose connectivity, or be interrupted
mid-task. Preserve safe intermediate state and make **committed vs uncommitted** work
explicit.

_Why:_ Hotshot is used socially and casually; mobile sessions are fragmented, and it's a
PWA.
_Example:_ a partially completed slate retains local selections and clearly distinguishes
_saved locally_ → _submitted_ → _locked_ (picks lock at kickoff).

### 10. Immediate feedback, durable confirmation

Every interaction acknowledges input immediately (pressed state, selection treatment,
optimistic update); a _consequential_ change also leaves a durable confirmation (a
persistent status, timestamp, lock state, or recoverable error) — not a disappearing toast
as the only signal.

Two house rules make this concrete on every surface:

- **The feedback ladder.** Prefer a durable state change (the lock flow's committed row);
  otherwise a persistent inline status note beside the control (`role="status"`, icon +
  semantic colour — one shared note component, not a hand-rolled div per call site). A
  toast is only ever a transient echo on top of one of those, never the sole signal for
  anything consequential.
- **Pending is not unavailable.** A control disabled because its work is in flight keeps
  its active styling with only the label changing ("Locking in…", "Syncing…"); the
  flat/muted disabled treatment is reserved for unavailable/incomplete. This generalizes
  the picks lock rule (design-system.md's selection tiers) to every surface, admin
  included.

_Why:_ motion can say a tap registered, but not that the operation ultimately succeeded.
_Example:_ **Lock in** enters a pending state immediately, then resolves to an unmistakable
locked state (motion tokens; the stale-while-revalidate model is [ADR-0017](adr/0017-client-data-cache.md)).

### 11. Empty, loading, error, and stale are designed states

A component isn't done until it defines loading, empty, partial, error, offline/stale, and
success — and each state **preserves the layout's hierarchy** instead of swapping the screen
for a generic spinner or error box.

_Why:_ mobile networks and PWA lifecycle make non-ideal states part of ordinary use.
_Example:_ if standings can't refresh, show the last good data with a stale indicator and a
retry, not a blank — the natural shape of the client cache ([ADR-0017](adr/0017-client-data-cache.md)).

### 12. Contrast floor is AA

Body and muted text must clear WCAG **AA** against the surface it sits on — including raised
cards, which are lighter than the page ground.

_Why:_ dark UIs make muted greys drift below legibility on raised surfaces.
_Example:_ `--muted-foreground` was lifted from `#9b958a` to `#a8a294` for AA headroom on
raised cards (see the token comment in `src/app.css`).

### 13. Semantic colour is not the accent

`--primary` (brass gold) is the brand accent and the "on"/selected state. Good/warning/
critical (`--success` / `--warning` / `--destructive`) are a **separate** semantic axis —
never repurpose the accent to carry meaning, nor let a status colour stand in for the
accent. `--ember` is reserved for live/urgent/signature moments (principle 5's stance).

Ember's sanctioned moments — a positive spec, so under-spend is as visible as leakage:
**Lock in** (the primary commitment), an **All-In** declaration, **live/urgent** game
states, the **Wrapped champion reveal** (to be built — the season's one celebration
peak, reduced-motion-guarded), and the **reigning champion's crowned card** on the
`/league` Honors tab (#741 design study — border/wash only, labels stay
`--primary-ink`/`--foreground` for AA in both themes; the card's in-season zero-state
is deliberately ember-free, so the accent igniting at crowning is the payoff). Routine
data fills use `--primary` (the CoverMeter fill is `--primary`, re-based from its
earlier ember gradient — #547). One recorded exception: the public demo's single
"Start your league" CTA — the marketing surface's one conversion verb. Anything new
earns its place via a design study and a new entry in this list.

_Why:_ if the accent also means "good", the user can't tell branding from signal.

### 14. Copy carries personality; controls carry clarity

Interactive labels say what will happen. The Commissioner voice may frame, celebrate, tease,
or narrate — but it must never obscure an action, status, deadline, or error.

_Why:_ swagger is an asset until it makes the user decode the interface.
_Example:_ good CTA "Lock in picks" + supporting line "The Commissioner has seen enough";
weak CTA "Send it", weak error "The Commissioner fumbled" (say what broke and how to fix it).

**One word, one referent — reserve "League" for the user's own group; call the NFL side
"the market" / "the NFL" / "NFL-wide", never "league."** The term overloads badly: a
player's pick pool is their "league" (fantasy idiom) _and_ the football league is a
"league." So the group is **League** (the tab, the standings, "your league"); the NFL
betting universe is **Market** (the `/market` tab) and its baseline is "the market line,"
never "the league line." Internal identifiers may keep `league` (e.g. `league_ats_*`,
`league-scope-select`) — this rule governs what the user reads, not the plumbing.

_Why:_ two referents for one word makes a user read "vs league" on their own stats as "vs
my group" when it means the NFL market. _Example:_ the `/market` tab (renamed from "Teams")
and the `/stats` diverging-bar baseline both say **market**, not "league-wide"/"vs league".

### 15. Density follows the task

Use compact layouts for comparison and repeated data; give decisions, onboarding, and
signature moments room. Don't apply one universal card density across the app.

_Why:_ "premium" drifts into excessive whitespace; "sports data" drifts into cramped
dashboards — the task should decide.
_Example:_ a standings list is dense and scannable; an All-In confirmation isolates the
choice and its consequence.

### 16. Accessibility survives interaction

Static contrast (principle 12) is the floor, not the whole story. Every interactive surface
supports visible focus, semantic controls, accessible names, keyboard operation where
applicable, reduced motion, text scaling, and **non-colour** state cues.

_Why:_ a PWA may be driven by assistive tech, a desktop keyboard, or user font/motion
preferences.
_Example:_ the chip radiogroup exposes real radio semantics and a selected value — not just
styled buttons.

## Pattern vocabulary

Where [`design-system.md`](agent-context/design-system.md) catalogs the **tokens**, this
catalogs the **composed patterns** — the atoms already in the app, and when to reach for
each. (Component homes live under `src/lib/components/`.)

| Job                               | Pattern                                            | Seen in                                   |
| --------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| Switch between cuts of one data   | Chip radiogroup (`ChipRadiogroup`)                 | `/stats` Every split + Breakdowns         |
| Split a page into top-level views | Tabs (two or three, page-level only — principle 2) | `/league`, `/wrapped`                     |
| Reveal secondary detail           | Single disclosure (one level)                      | picks committed section                   |
| Show a rate / accuracy            | Meter bar + 50% reference tick                     | `CoverMeter`, `/stats` lists              |
| Compare a value to a baseline     | Diverging bar from the market line                 | `/stats` Every split, `/market`           |
| Pick player + season/scope        | Sticky context bar (selectors)                     | `/stats` context bar                      |
| Group related content             | `Card` + header/description                        | everywhere                                |
| Announce a form/action outcome    | Persistent inline status note (`FormNote`)         | `/league/manage`, `/settings` League card |
| Confirm a consequential action    | Inline anchored confirm beside the control         | picks All-In move                         |
| Loading placeholder               | Pulse skeleton preserving the layout's hierarchy   | `/league/manage`, `/market`, `/stats`     |
| Show stale/offline data           | Last-good data + stale pill + retry (ADR-0017)     | to build (shell-level)                    |

Prefer these before inventing a new control. If a screen genuinely needs a pattern not
listed here, that is the signal to run a `design-study` and add it. As each pattern is next
touched, promote its row to the full anatomy below — the chip radiogroup is the worked
template.

Two named rules govern season-scoped surfaces (adopted from the 2026-07-21 IA review,
first applied by #737 on `/league`):

- **Default to the last graded thing.** A temporal control's bare-visit default is the
  most recent thing that actually graded — never the calendar season (which Schedule Sync
  seeds months early, yielding empty screens) and never a silent flip to a career/all-time
  scope (which hides the season's content). Offseason, that means the concluded season,
  pinned honestly ("Last season · YYYY", never "This season"); other windows are explicit,
  URL-addressable choices.
- **A crowned season leads with its crown.** How a surface leads is keyed on the _viewed_
  season's data-state, not the calendar — so the same season's page renders identically in
  July and November, and the archive tier (story charts, the race) always trails the
  answers. On `/league` the rule's application moved with #741: the crown's first paint is
  the honors strip above the tabs plus the Honors tab itself (whose champion card is
  crowned or an honest "not decided yet"), rather than #737's block reordering inside the
  standings panel — which retired when the honors left that panel. The block-order form
  still applies to any season-scoped surface that keeps honors and answers in one scroll.

**The second consumer triggers extraction.** "Seen in" is a starting point, not a licence
to copy markup: as soon as a second surface needs a pattern, extract it into a shared
component under `src/lib/components/` and update its row here to name the import. The
2026-07-11 audit found three hand-copies of the chip radiogroup — one of which had
silently lost its keyboard contract — and twelve hand-copies of the status note; copies
drift, imports don't. `FormNote` is that extraction, and #660's new `/settings` League card
imports it — but the rest of `/settings` (profile, avatar, theme, trends, identities,
notifications) still hand-rolls the border-only div and is the largest remaining cluster.
Those copies announce nothing to a screen reader, which is the concrete cost.

### Worked example — chip radiogroup

1. **Job.** Select exactly one **peer view within one analytical surface and context** —
   the peers may be cuts of one dataset _or_ different renderings of the same subject
   (Team · Weight · Trend · H2H all describe one player's picks). "Same content" is the
   context, not the chart type.
2. **Use when.** The options are peers, labels are short, switching is immediate (no
   navigation, no consequential write), and the user does **not** need to see more than one
   panel at once.
3. **Don't use when.** The choices navigate to distinct destinations, trigger a
   consequential action, need **simultaneous comparison** (keep the panels visible, or use
   independent disclosures, instead), or can't fit a readable mobile row without a
   deliberate overflow treatment — reach for tabs, a menu, or buttons instead.
4. **Anatomy.** A labelled group; one chip per option; exactly one selected; an optional
   scope caption ("follows Career").
5. **States.** Selected (brass fill) · unselected (outline) · focus-visible ring · disabled
   (flat/muted, never dimmed brass) · the panel it drives updates in place. **Dynamic
   option sets** (scope changes which cuts exist — e.g. Career vs Season): keep the current
   selection if it's still available, else fall back to a deliberate default; at all times
   exactly one _available_ radio has `aria-checked="true"` and the roving `tabindex="0"`.
6. **Mobile behaviour.** Prefer wrapping when it stays scannable; use contained horizontal
   scroll only when wrapping would imply false grouping or blow up height, and give a
   scrollable row a visible continuation cue (an edge fade). Never let the row clip the
   page; wide panel content owns its own overflow independently of the chip row. The
   initial selection is a deliberate design decision, not whatever array order yields.
7. **Accessibility contract.** `role="radiogroup"` with real `radio` children, one selected
   value, arrow-key + Home/End keyboard operation, an accessible group name; selecting a
   chip does not move focus into the panel. **When several chip groups share a page** (as on
   `/stats`, which runs three — the situational explorer plus the career and season
   breakdowns): each has a distinct visible heading and accessible name, and every
   control/panel `id` is unique. The shared `ChipRadiogroup` takes an `idPrefix` prop for
   exactly this reason — the three groups pass `stats-cut-tab`, `career-breakdown`, and
   `season-breakdown`, so their radio `id`s never collide. The active panel's accessible
   name derives from the selected cut.
8. **Canonical examples.** `/stats` "Every split"; `/stats` "Breakdowns" (career + season,
   #538). (The `/market` slice explorer (#529) was canonical here until #692 retired it.)
9. **Known exceptions.** None. (Page-level Tabs are **not** an exception — they own a
   different job; see principle 2's boundary.)

## Hard constraints (pre-merge checklist)

These are **rules, not suggestions** — pass/fail, and they belong in the PR template as a
gate for UI changes. The principles above guide judgment; this list gates the merge.
Deliberately light on CI: design conformance is mostly not mechanically checkable — the one
exception, raw hex / off-palette scales, is already guarded by `check-brand-colors` (#530).

- [ ] Nothing clips horizontally at 390px; wide content scrolls in its own container.
- [ ] No disclosure is nested inside another disclosure.
- [ ] "Switch a cut" uses the chip radiogroup, not a second control.
- [ ] User-facing copy never calls the NFL "league": **League** = the user's group; the NFL
      side is "the market" / "NFL-wide" (internal identifiers may keep `league`).
- [ ] Colours/type/spacing come from tokens (the brand-color guard passes).
- [ ] The primary action is visually dominant; committed vs uncommitted state is unmistakable.
- [ ] Loading / empty / error / stale states are designed and keep the layout's hierarchy.
- [ ] Consequential actions give immediate feedback **and** a durable confirmation (a toast
      is never the sole signal); in-flight controls keep their active style — pending ≠
      unavailable.
- [ ] Muted/body text clears AA **in both themes** (gold text/borders use `--primary-ink`,
      not `--primary`); interactive controls have visible focus using the canonical ring
      recipe (design-system.md), semantic roles, and keyboard operation (a chip group is a
      real radiogroup).
- [ ] Motion respects `prefers-reduced-motion` and uses the motion tokens.

## How to check your work

- **Before building** a new or reworked surface, run the `design-study` skill — it captures
  the current screen at 390px dark (the primary capture skin), names the structural
  problems, and mocks before/after in the real skin. Any new colour or contrast decision the
  study proposes is also checked against the light Parchment theme, not just dark.
- **To critique** a shipped screen, run a `design-review` (screenshot + scorecard at 390px
  dark, no mockups).
- Both share the throwaway Playwright capture harness (390px, `deviceScaleFactor: 2`,
  `colorScheme: 'dark'` as the primary skin) — see the skills for the config.
- **When this guide names a screen as canonical, re-verify that screen in the same PR** —
  the guide originally shipped citing `/stats` as the exemplar while `/stats` carried the
  guide's own named anti-pattern (the nested drawer).
- **Re-audit periodically.** The baseline drift log is
  [`docs/audits/2026-07-11-ui-consistency-audit.md`](audits/2026-07-11-ui-consistency-audit.md);
  re-run a full consistency audit after every ~10 UI-touching PRs or at each offseason, and
  update that baseline.

## Related

- [ADR-0030](adr/0030-mobile-first-design-principles.md) — ratifies this guide as the
  standing interaction-design decision.
- [ADR-0029](adr/0029-design-system-token-architecture.md) /
  [`design-system.md`](agent-context/design-system.md) — the token vocabulary this
  composes.
- [ADR-0027](adr/0027-rebrand-sunday-bets-to-hotshot.md) — the identity and palette both
  build on.
- [`docs/agent-context/ui.md`](agent-context/ui.md) — vendored shadcn-svelte, Svelte 5
  runes, Tailwind 4.
- [`src/app.css`](../src/app.css) — the single source of truth for token values.
- [`docs/audits/2026-07-11-ui-consistency-audit.md`](audits/2026-07-11-ui-consistency-audit.md) —
  the baseline drift log this guide's 2026-07-11 amendments (Tabs boundary, feedback
  ladder, ember spec, extraction rule) respond to.
