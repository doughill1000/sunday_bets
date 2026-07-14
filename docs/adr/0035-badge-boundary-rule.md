# ADR-0035: Badge catalog boundary — the rating owns the market, badges own the room

- Status: Accepted
- Date: 2026-07-14
- Issue: #634
- Supersedes: None

## Context

Issue #634 deletes two season badges — 📈 The Sharp ("best cover rate this season")
and 🤡 The Fool ("worst contrarian win rate") — because they duplicate and contradict
a number the app already ships better: the cross-season credibility rating
(ADR-0032). The Sharp and the rating's Sharp _tier_ measure literally the same thing
(cover rate vs. the market), but the tier does it on every axis that matters — career
window vs. one season, shrunk-toward-par vs. raw `wins/(wins+losses)`, an eligibility
gate vs. a hard decision-count guard, deliberately conviction-flat (ADR-0032 v2) vs.
`weight_enum`-weighted by accident, and an honest "nobody yet" (Unrated) state vs. a
badge that must always crown someone. Live prod data confirms the two surfaces
actively disagree: the badge crowns a 52.5% cover-rate player while the only Hotshot
in the room holds no badge for it at all.

This is not a one-off naming collision — it is the second time it has happened (#631
already renamed _Sharp of the Week_ → _Game Ball_ to dodge the same word colliding
with the rating's tier name). Without a recorded boundary, a future badge proposal
("best ATS record this month", "closest to 50/50") will re-invent the same
contradiction, because nothing currently says badges may not measure market
performance. This is exactly the "creates a constraint that will affect multiple
future features" ADR trigger (`docs/adr/README.md`) — the deletions in #634 are
local and reversible on their own, but the rule that justifies them needs to be
durable, or the next badge idea re-litigates it from scratch.

## Decision

**The credibility rating owns the market; badges own the room.**

1. **The rating (ADR-0032) is the sole surface for "how well does this player beat
   the market."** No badge may measure cover rate, ATS record, or any other
   market-relative performance metric, in whole or in part — that measurement
   already exists, career-scoped, sample-shrunk, and gated behind eligibility, and a
   badge version of it will always be a worse, noisier restatement.
2. **Badges measure things about the room the rating deliberately discards or
   cannot see** — conviction (The Whale: does an All-In pay off, which ADR-0032 v2
   made conviction-_flat_ on purpose), contrarian timing conditioned on what the
   room believed (The Oracle), in-season narrative moments (drop-worst-week saves,
   comeback weeks), and other player-vs-peers or player-vs-moment facts that have no
   career/market framing. If a proposed badge's plain-English description is "beats
   the market," it fails this test regardless of window or sample size — the
   solution is to point at the rating, not to ship a badge-shaped version of it.
3. **A badge that cannot honestly say "nobody" is suspect.** The rating can render
   Unrated or an empty tier; a season badge that must always crown someone on a
   6-player league manufactures significance. This does not ban all "always
   resolves" badges outright (e.g. genuinely rare narrative moments may be legitimately
   frequent), but it is a smell worth weighing at proposal time, alongside the
   market-boundary test in (1)-(2), which remains the hard rule.

This ADR governs future badge proposals in `src/lib/domain/badges.ts`; it does not
itself change badge code — the concrete deletions (`the-sharp`, `the-fool`, the
`weekWinner` sole-possession fix) are implemented in #634 as ordinary,
independently-reversible derived-on-read logic.

Also corrected: `docs/adr/README.md`'s index line for ADR-0032 still described the
rating as "conviction-weighted," a description the v2 amendment (#618, accepted the
same day as v1) inverted to conviction-flat. That line is updated to
"conviction-flat" alongside this ADR so the index does not contradict ADR-0032's own
amendment history.

## Consequences

- **Helpful:** future badge proposals get a fast, mechanical triage question ("does
  this measure beating the market?") instead of re-deriving the Sharp/Fool argument
  from scratch each time.
- **Helpful:** keeps the rating as the single place market-skill claims about a
  player are made, so the two surfaces can never again silently disagree about who
  is sharp.
- **Cost:** narrows the design space for future badges — a plausible-sounding badge
  idea ("best against the spread this month") is now out of bounds by rule, not by
  case-by-case judgment, and must be redirected toward the rating or the ladder
  instead.
- **Cost:** the rule is deliberately about market performance specifically, not
  every possible future badge-vs-rating overlap; edge cases (e.g. a badge about
  rating _volatility_ rather than level) will still need judgment calls at proposal
  time.

## Alternatives considered

- **No ADR — treat #634 as pure local deletion.** The deletions themselves qualify
  (derived-on-read, no persisted rows, trivially reversible), but the issue's own
  ADR-requirement analysis flagged that the justification is a cross-cutting
  constraint, not a local detail. Rejected — the risk is the same contradiction
  recurring with the next badge idea.
- **Fold this into ADR-0032 as an amendment.** ADR-0032 defines what the rating
  measures; it says nothing about badges and amending it would conflate "what the
  rating is" with "what badges may not be." Rejected as scope creep on an already
  twice-amended ADR.
- **Ban any badge that overlaps the rating's inputs at all** (e.g. also forbidding
  win/loss-count badges). Too broad — raw records are their own explicitly
  ADR-0005/0018-sanctioned surface, separate from both the rating and badges.
  Rejected; the rule targets the market-performance framing specifically.

## Follow-up

- **#634** — the concrete deletions (The Sharp, The Fool) and the Week Winner
  sole-possession fix this ADR's boundary rule justifies.
- The `alphaFirst` tie-break defect across the other 18 single-holder badges is a
  known, explicitly out-of-scope follow-up (#634's "Excluded" section) — a separate
  decision, not covered by this ADR.
- The axis layer and grouped-awards-card issue (blocked on #634's trimmed catalog)
  should apply this same boundary test to any new badge it introduces.
