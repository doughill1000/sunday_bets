# Design-system context pack

> The token **vocabulary** every surface draws from. Rules that used to live only as
> comments in `src/app.css` are codified here. Canonical source for the values is
> `src/app.css` (`@theme inline`); the architecture and boundaries are
> [ADR-0029](../adr/0029-design-system-token-architecture.md), evolving the Hotshot
> palette of [ADR-0027](../adr/0027-rebrand-sunday-bets-to-hotshot.md). See
> [ui.md](ui.md) for the vendored-shadcn and Svelte 5 / Tailwind 4 rules, and
> [`../DESIGN.md`](../DESIGN.md) for the mobile-first interaction principles that
> compose these tokens ([ADR-0030](../adr/0030-mobile-first-design-principles.md)).

## The one rule

**Reach for a token, never a raw scale or an inline hex.** `text-yellow-500` and
`style="color:#dba73b"` both bypass the palette and can't respond to a theme switch.
`scripts/check-brand-colors.ts` (in `pnpm lint`, local + CI) fails on both. The token
layers on Tailwind's defaults — the primitive scales (`text-sm`, `p-4`, `font-medium`,
`rounded-md`) are Tailwind's and are fine; the tokens below add the app-level semantics.

## Token catalog

### Color (ADR-0027)

Semantic color tokens are defined in `src/app.css` and consumed as Tailwind utilities
(`bg-card`, `text-primary`, `border-border`) or `var(--primary)` in raw CSS. Both themes
are live: `.dark` is the dark palette and `:root` is the "Parchment" light theme (#532),
chosen per user via `users.theme_pref`. Every token carries a maintained value in each, so
a call site works under either theme.

| Reach for…                     | Token                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| gold / brass **fill**          | `--primary` (`bg-primary`, carries a dark label)           |
| gold / brass **text / border** | `--primary-ink` (`text-primary-ink`, `border-primary-ink`) |
| spark / live / urgent          | `--ember` (reserved marquee accent)                        |
| win / positive                 | `--success`                                                |
| loss / negative                | `--destructive`                                            |
| caution / push                 | `--warning`                                                |
| muted neutral                  | `--muted-foreground`                                       |
| surfaces                       | `--background` → `--card` → `--popover`                    |

**The accent has two roles: a fill and an ink.** `--primary` is the brass _fill_ — it
always carries a dark label (`--primary-foreground`), so it can stay bright in every
theme. `--primary-ink` is the same brass used _as_ content — a gold label, an eyebrow, a
selected-weight outline — sitting on a normal surface. The distinction matters because
bright brass as text/border clears AA on charcoal but **fails it on a light ground**, so
the ink needs a darker brass there while the fill doesn't. Splitting the token now (both
themes carry `--primary-ink`; on dark it aliases `--primary`) is what lets a gold-as-text
call site survive the light-theme flip (#532) without a per-site override. Reach for
`text-primary-ink` for gold text/borders and `bg-primary` for a gold fill; don't use
`text-primary` for a gold label. The existing `text-primary`/`border-primary` text/border
call sites were migrated to `text-primary-ink` with the light theme (#532): on dark the two
are identical (ink aliases `--primary`), while on light the ink darkens to `#8a6210` to
clear AA where bright brass would fail as text/border.

### Typography

A semantic ramp that bundles size + line-height + weight, so a surface picks one token
instead of re-tuning three. Primitive sizes (`text-xs…text-9xl`) remain Tailwind's.

| Token          | Use                                        |
| -------------- | ------------------------------------------ |
| `text-stat`    | the big numeral — scores, cover %, totals  |
| `text-title`   | card / section heading                     |
| `text-eyebrow` | all-caps section kicker (carries tracking) |

The slot map — one answer per recurring slot, so nobody re-tunes:

| Slot                   | Reach for                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| page title (`h1`)      | `text-3xl font-bold tracking-tight` + muted subline (tokenization candidate)                                                |
| card / section heading | `text-title`                                                                                                                |
| all-caps kicker        | `text-eyebrow` — never a hand-rolled `text-[10px]`/`text-[11px]` `uppercase tracking-*` (that's this token by another name) |
| big numeral            | `text-stat` — not `text-2xl`/`text-3xl font-bold`                                                                           |

Arbitrary sizes below `text-xs` are off the ramp; if a label can't work at `text-xs`,
that's a layout problem, not a font-size problem.

### Spacing

Named rhythm on Tailwind's `--spacing-*` namespace — `p-gutter`, `gap-section`, etc.
Use these for _semantic_ rhythm; the numeric scale (`p-4`, `gap-2`) is fine for
one-off local spacing.

| Token     | Use                                |
| --------- | ---------------------------------- |
| `gutter`  | page / card horizontal padding     |
| `section` | gap between major page sections    |
| `stack`   | vertical rhythm inside a card      |
| `inline`  | gap between inline chips / buttons |

### Elevation

`shadow-elevation-{card,popover,overlay}` — theme-responsive shadows that separate each
stacked surface tier from the one below. See [Elevation layering](#elevation-layering).

Reach for the token by the surface's tier, never a raw `shadow-sm/md/lg/xl`: a raised
`Card` → `shadow-elevation-card`; a dropdown / popover / floating panel →
`shadow-elevation-popover`; a dialog / sheet / modal overlay →
`shadow-elevation-overlay`. Wire this into the vendored bases (`ui/card`, `ui/dialog`,
`ui/sheet`, `ui/dropdown-menu`) once so every consumer inherits the right tier — a raw
shadow at a call site is the smell that a floating surface skipped the token. (A heavier
raw shadow on a lighter tier — e.g. a dropdown sub-menu louder than a modal — is exactly
the inversion the token prevents.)

### Motion

Semantic durations and app easings. Kept short on purpose: locking is high-frequency,
so the theatrical budget stays with the All-In moment (ADR-0023).

| Token                               | Use                                   |
| ----------------------------------- | ------------------------------------- |
| `--duration-fast` (150ms)           | hovers, small state flips             |
| `--duration-base` (200ms)           | the default transition                |
| `--duration-slow` / `-deliberate`   | larger reveals; celebratory moments   |
| `ease-standard` / `ease-emphasized` | standard vs. entrance/emphasis easing |

Durations have no Tailwind utility namespace — consume them via
`duration-[var(--duration-base)]`, inline styles, or the `$lib/ui/motion` helper (the
picks lock/unlock micro-interaction). Easings generate `ease-standard` / `ease-emphasized`.
Animation is off the ramp only when it's a raw `duration-150`/hardcoded-ms value; those
are the migration targets. `$lib/ui/motion` is a sanctioned consumer of this ramp (not a
parallel system) — its constant should equal a `--duration-*` value, and its comment
should point here rather than claim no repo-wide motion system exists.

**Reduced motion is not opt-in.** Every animation must collapse under
`prefers-reduced-motion: reduce`. Rather than guard each site, a single global rule in
`src/app.css` zeroes animation/transition durations under that media query, so the
vendored layer and any new animation comply by default; a JS-driven interaction (the
picks flow) collapses its own timing in addition. Ambient/looping animations
(a progress bar, a pulse skeleton) are the ones that most need this — check them first.

## Selection-tier system (picks card)

The picks card uses a strict loudness ladder so nothing fights the **Lock in** CTA.
Each tier reads as strictly louder than the last (the rules and CSS live in
`src/app.css` under `.picks-board`):

1. **Cream** (`--foreground`) — information / labels.
2. **Charcoal** (raised surface) — an inactive, pickable choice (team / weight button).
3. **Brass** (`--primary`) — a _selected modifier_: the chosen weight (brass outline +
   subtle tint, not another filled block).
4. **Ember** (`--ember` / `--lock-bg`) — **primary commitment**: the selected team fill
   leans dark/brown so it reads as "selected" without competing, and **Lock in** itself
   is the brightest, loudest element on the card.

Disabled Lock in is deliberately flat/muted (cream at low opacity), never a dimmed
brass, so it never reads as "kind of active". A save in flight stays ember (only the
label changes) — the flat inert style is reserved for an _incomplete_ pick.

## Elevation layering

Surfaces stack `background → card → popover`, and the shadow tier tracks that stack:

- `shadow-elevation-card` — a card lifted off the page background.
- `shadow-elevation-popover` — menus, popovers, and floating panels above cards.
- `shadow-elevation-overlay` — modal / sheet overlays, the topmost tier.

In the dark theme the three surfaces share a hue, so **shadow (not lightness) is what
reads the layering** — hence deeper, blacker dark shadows. On the Parchment light theme
(#532) the surfaces differ in lightness, so the same tokens carry a warm-brown _whisper_
shadow instead — the layering reads by lightness, not a black drop-shadow.

## Focus ring

One recipe for every interactive surface, so keyboard focus reads the same everywhere:

```
focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50
```

This is the vendored shadcn default (`button`, `input`, `tabs`, `toggle`,
`radio-group`, …) — hand-written controls (chips, native `<select>`s, icon buttons)
should match it rather than invent a variant. Rules that keep it consistent:

- **`focus-visible:`, never `focus:`** — a pointer tap must not paint a ring.
- **`--ring`, not `--primary`** — the ring is a focus affordance, not the selected
  state; don't retune its colour or width per component.
- **Never `outline-none` without a replacement** — removing the ring with nothing in its
  place leaves keyboard users with no focus indicator at all (a hard-constraint fail).
- A styled radiogroup (chips) is still a real radiogroup: focus the group, arrow between
  options (roving tabindex), and show the ring on the focused option.

The global `* { outline-ring/50 }` base in `src/app.css` is the floor for anything that
slips through; call sites should still declare the ring explicitly.

## What stays untokenized (allowlisted)

Genuinely dynamic colors are **not** tokenized and are allowlisted in the guard:
`--chart-*` (data-series colors), per-team colors, and `UserAvatar` generation
(`src/lib/avatars.ts` presets + the `#fff` label). External brand marks — the Google
"Sign in" colors — are fixed brand values, also allowlisted. For a new dynamic source,
add it to the allowlist in `scripts/check-brand-colors.ts` or mark the line with a
`brand-color-allow` comment.

## Validation

```sh
pnpm lint       # prettier + eslint + check-brand-colors (scales + raw hex)
pnpm check      # svelte-check
pnpm db:reset:demo && pnpm dev   # visual pass — all four pick states unchanged
```
