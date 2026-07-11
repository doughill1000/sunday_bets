# ADR-0029: Design-system token architecture

- Status: Proposed
- Date: 2026-07-11
- Issue: #530
- Supersedes: None

## Context

The app has a mature dark "Hotshot" palette ([ADR-0027](0027-rebrand-sunday-bets-to-hotshot.md))
mapped to Tailwind via `@theme inline` in `src/app.css`, a vendored shadcn-svelte
`ui/` library, and a brand-color guard (`scripts/check-brand-colors.ts`, #476) that
fails raw Tailwind color _scales_. But the token vocabulary stops at **color +
radius**:

- **Typography, spacing, elevation, and motion are per-component guesses.** Each new
  surface re-picks a font size, a gap, a shadow, a transition duration by eye, so the
  app drifts instead of composing from a shared vocabulary.
- **The color/elevation/selection rules live only as CSS comments** in `app.css` —
  not discoverable from a context pack, easy for a new surface to miss.
- **The guard can't see inline hex.** It catches `bg-green-400`-style scales but not a
  literal `#dba73b`, which bypasses the palette entirely and — critically — **cannot
  respond to a theme switch**.

This is the **prerequisite layer for a real light theme** (a follow-up, blocked by
this decision): a light theme needs a light _and_ dark value for every color and
elevation token, and it cannot flip anything still written as an inline hex literal.

A note on the inline-hex migration this issue anticipated: an audit found the app was
already clean. The `src/**/*.svelte` tree carries only **six** hex literals, all
genuinely non-tokenizable — the four fixed Google "Sign in with Google" brand colors
and two `#fff` labels over per-user generated avatar backgrounds. The "~63 inline hex"
the issue estimated were almost entirely **issue references in comments and body text**
(`(#517)`, `(issue #500)`) that a naive `#[0-9a-f]{3,6}` grep swept up. So the
migration is effectively a no-op; the real work is the token families, the doc, and a
guard that catches _future_ hex without tripping on issue references.

## Decision

Establish **one documented token vocabulary** layered on Tailwind's defaults, codify
its rules in a context pack, and extend the guard to keep raw hex out.

**1. Token families in `src/app.css` `@theme inline`.** We add only _semantic_ tokens
that encode an app-level decision; the primitive scales (numeric spacing, `text-xs…9xl`,
`font-weight-*`, `radius`) stay as Tailwind's built-in `@theme` and are **not restated**.

- **Typography** — a small semantic ramp (`--text-stat`, `--text-title`,
  `--text-eyebrow`) that bundles size + line-height + weight (+ letter-spacing for the
  eyebrow) so a surface picks one token instead of re-tuning three.
- **Spacing** — named rhythm (`--spacing-gutter/section/stack/inline`) on Tailwind's
  `--spacing-*` namespace, so `p-gutter` / `gap-section` generate. (The issue's
  `--space-*` shorthand maps onto Tailwind's real `--spacing-*` namespace.)
- **Elevation** — `shadow-elevation-card|popover|overlay`, mirroring the implicit
  `background → card → popover` surface layering. The shadow value is
  **theme-responsive**: a light placeholder in `:root`, a deeper/blacker value in
  `.dark` (dark surfaces share a hue, so shadow, not lightness, reads the layering).
- **Motion** — semantic durations (`--duration-fast/base/slow/deliberate`) and app
  easings (`--ease-standard`, `--ease-emphasized`). Durations stay short by policy:
  locking is high-frequency, so the theatrical budget stays with the All-In moment
  ([ADR-0023](0023-all-in-signature-moment.md)). This is the shared system the local
  `$lib/ui/motion` helper deliberately deferred to an ADR.

**2. Documented rules.** A new `docs/agent-context/design-system.md` context pack owns
the token catalog, when-to-use guidance, the picks-card **selection-tier** system
(cream → charcoal → brass → ember), and the **elevation layering** — moving those rules
out of `app.css` comments and into the pack index next to `ui.md`.

**3. Guard extension.** `scripts/check-brand-colors.ts` also fails **raw hex**. To
avoid tripping on issue references (`#500` is lexically a 3-digit hex), it (a) scans a
comment-stripped copy of each file, and (b) flags 6-/8-digit hex anywhere but 3-/4-digit
hex only in a CSS/attribute _value_ position. Genuinely dynamic sources are exempted by
a short, justified allowlist (the Google mark; the avatar labels) plus an inline
`brand-color-allow` escape hatch. It runs in `pnpm lint` (local + CI).

**Boundaries future work must preserve.** Every new color/elevation token carries both
a light and a dark value. New surfaces reach for a token, never a scale or an inline
hex. The vendored `ui/` library is not hand-edited. Genuinely dynamic colors
(`--chart-*`, per-team colors, avatar generation) stay untokenized and allowlisted.

## Consequences

- **Helpful:** surfaces compose from one vocabulary instead of re-guessing; the rules
  are discoverable in a pack, not buried in CSS comments; the guard now blocks the one
  thing that can't theme (inline hex); and the light theme is unblocked — token
  families exist and every value has a dark slot ready for a light sibling.
- **Costs:** a naming seam — the issue's `--space-*` is Tailwind's `--spacing-*`, and
  `--duration-*` has no Tailwind utility namespace so durations are consumed via
  `duration-[var(--duration-base)]`, inline styles, or `$lib/ui/motion`. Some semantic
  tokens ship ahead of their first consumer (deliberate: this is a foundations layer).
  The guard's hex heuristic can, in a rare edge case, miss a hex hidden inside a
  comment-like string — a false negative, never a false positive on prose.

## Alternatives considered

- **Restate the full Tailwind scale in `@theme`.** Rejected: hundreds of redundant
  lines that just mirror defaults, with no app-level meaning and real drift risk.
- **A rendered `/design` catalog route.** Out of scope; the context pack is the
  reference. A live catalog can follow.
- **Match every `#…` as hex in the guard.** Rejected: it floods on issue references in
  comments and body text. The comment-strip + length/context rule is what makes the
  guard usable.
- **An ESLint rule instead of a script.** Rejected (same reason as #476): ESLint can't
  read the string contents of a Svelte `class`/`style` attribute.

## Follow-up

- **Light theme** (`theme_pref`, toggle, light color + elevation values) — the issue
  this one unblocks.
- Adopt the semantic typography/spacing/motion tokens on existing surfaces
  opportunistically as they're next touched (not a big-bang refactor).
- A rendered `/design` token catalog, if the pack proves insufficient as a reference.
