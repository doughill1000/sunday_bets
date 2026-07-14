# ADR-0035: Badge catalog boundary — the rating owns the market, badges own the room

- Status: Accepted, amended 2026-07-14
- Date: 2026-07-14
- Issue: #634; amended by #647
- Supersedes: None

## Amendment history

- **v1 (#634, 2026-07-14):** the market boundary — the rating owns the market, badges own
  the room — justifying the deletion of The Sharp and The Fool.
- **v2 (#647, 2026-07-14):** a full audit of the remaining catalog against four seasons of
  prod data (2022–25, 6 players) cut four more badges and produced three durable rules that
  v1 either only hinted at or missed. v2 promotes §3 from a smell to a hard rule, adds the
  zero-provenance triage question (§4) that predicts breakage better than the market test
  alone, and adds the one-measure-one-surface rule (§5). The v1 boundary is unchanged.

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
3. **A badge MUST be able to resolve to nobody.** _(v1: a smell worth weighing. Promoted
   to a hard rule in v2.)_ The rating can render Unrated or an empty tier; a season badge
   that must always crown someone on a 6-player league manufactures significance.

   v2 promotes this because the evidence is total: across all 19 badges and four seasons,
   **every badge that always crowned someone was broken, and every badge that could go
   dark was sound.** There were no exceptions in either direction. v1 hedged that
   "genuinely rare narrative moments may be legitimately frequent" — the audit found no
   such case, and the hedge was doing nothing but keeping four broken badges alive.

4. **Ask where the badge's zero comes from.** This is the triage question that actually
   predicts breakage, and it runs **before** the market test in (1)–(2) because it catches
   strictly more. Three answers:

   - **Event** — zero is "it didn't happen." The world hands it to you and there is
     nothing to tune. All five of the catalog's healthy badges are event badges.
   - **Verdict** — zero is 50%, also given by the world (a spread pick is a coin flip by
     construction), but it **needs a bar**. Missing that bar broke The Whale, The Choker,
     The Oracle and The Lemming identically: each reduced to the top or bottom of a sorted
     list and crowned it regardless of whether anyone had been good or bad.
   - **Lean** — **no natural zero; the room is the zero**, computed per season, plus a bar.
     Line lean reached for an absolute even split and measured the schedule rather than the
     player; crowd lean had no zero at all and shipped dark.

   If a proposed badge's zero is none of these three, it is measuring luck or an artifact
   of the format, and it is not a badge. Hot Hand's zero was "a streak of zero", which
   sounds like an event but carries no skill signal to threshold — the expected longest run
   for the luckiest of six ~270-pick coin-flip seasons is 9–10, and the records are 10, 9,
   9, 8. The Homer's zero was bounded by the schedule: everyone picks every game, so the
   whole signal band is one percentage point wide.

   **The taxonomy already exists in the engine** as `award()`'s two kinds: `title` (a
   ranking — exactly one holder, needs a tie-break) vs `milestone` (a threshold — zero or
   more holders, no tie-break). Event badges are milestones. **Miscasting one as the other
   is itself the defect**, and an `alphaFirst` tie-break on a threshold is only its symptom
   (#651).

5. **One measure, one surface.** §1 forbids a badge from restating _the rating_; this
   generalizes it to any two badges. Two badges may not measure the same quantity at
   different strictness — the weaker one is strictly worse and will always contradict the
   stronger. Big Game Hunter was The Whale with the rate and the bar removed, so it crowned
   a player who went 8–20 on All-Ins in the same season The Whale would have gone dark.
   The disposition for a good idea on the wrong surface is to **move it, not to duplicate
   it**: a live win streak is genuinely fun, but as in-week sweat-board status rather than
   a season title (#652).

This ADR governs future badge proposals in `src/lib/domain/badges.ts`; it does not
itself change badge code — the concrete deletions and repairs (`the-sharp`, `the-fool`
and the `weekWinner` sole-possession fix in #634; `the-homer`, `the-nemesis`,
`big-game-hunter`, `hot-hand` and the bars/zeros in #647–#651) are implemented as
ordinary, independently-reversible derived-on-read logic.

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
- **Helpful (v2):** the zero-provenance question (§4) turns "is this badge any good?" from
  a data-analysis exercise into a two-minute conversation at proposal time, and it names
  the fix rather than only the fault — a verdict badge needs a bar, a lean badge needs the
  room. It also predicts the failure the market test misses entirely: three of #647's four
  cuts were not market restatements.
- **Helpful (v2):** the catalog now says something true. Every remaining badge can go dark,
  and several do — which is what makes the ones that fire mean anything. The Whale fires
  once in four seasons; that is the badge working, not the badge broken.
- **Cost (v2):** the catalog shrinks 19 → 15 and the surviving badges fire less often. A
  6-player league's honors shelf will have visibly empty slots in some seasons. That is the
  intended trade — an award nobody can fail to win is not an award — but it is a real
  change in how full the screen looks.
- **Cost (v2):** §3 as a hard rule may eventually reject a badge that is genuinely
  always-earned and still worth having. The audit found no such badge in 19 tries. If one
  appears, amend this ADR rather than quietly exempting it.
- **Cost (v2):** the lean rule makes badges league-relative, so the same behaviour earns a
  badge in one room and not another, and a player's own history can't be compared across
  seasons on a lean axis. That is correct for a "how unusual are you _here_" claim and
  wrong for anything else — which is why only lean badges take a league zero.
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
- **#647** — this amendment, plus the four cuts it justifies (The Homer, The Nemesis,
  Big Game Hunter, Hot Hand); **#648** the verdict bars, **#649** the lean zeros,
  **#651** the Grinder/Week Winner recast. All landed together as one catalog audit,
  because the rules and the changes that apply them only make sense read as one.
- **#652** — the sweat-board streak status: Hot Hand's idea relocated per §5, deliberately
  ephemeral and off the honors shelf.
- The `alphaFirst` tie-break defect on genuine single-holder titles (The Whale, The Oracle,
  The Ghost, …) remains a known, explicitly out-of-scope follow-up — a separate decision,
  not covered by this ADR. #651 removed The Grinder and The Choker from its scope, but only
  by establishing they were never rankings; §4 narrows the open question to "what should a
  real title do with a tie", which is the whole of what is left.
- The axis layer and grouped-awards-card issue (blocked on #634's trimmed catalog)
  should apply this same boundary test to any new badge it introduces.
