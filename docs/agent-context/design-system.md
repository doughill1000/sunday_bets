# Design-system context pack

> The token **vocabulary** every surface draws from. Rules that used to live only as
> comments in `src/app.css` are codified here. Canonical source for the values is
> `src/app.css` (`@theme inline`); the architecture and boundaries are
> [ADR-0029](../adr/0029-design-system-token-architecture.md), evolving the Hotshot
> palette of [ADR-0027](../adr/0027-rebrand-sunday-bets-to-hotshot.md). See
> [ui.md](ui.md) for the vendored-shadcn and Svelte 5 / Tailwind 4 rules.

## The one rule

**Reach for a token, never a raw scale or an inline hex.** `text-yellow-500` and
`style="color:#dba73b"` both bypass the palette and can't respond to a theme switch.
`scripts/check-brand-colors.ts` (in `pnpm lint`, local + CI) fails on both. The token
layers on Tailwind's defaults — the primitive scales (`text-sm`, `p-4`, `font-medium`,
`rounded-md`) are Tailwind's and are fine; the tokens below add the app-level semantics.

## Token catalog

### Color (ADR-0027)

Semantic color tokens are defined in `src/app.css` and consumed as Tailwind utilities
(`bg-card`, `text-primary`, `border-border`) or `var(--primary)` in raw CSS. The dark
palette is the live one; `:root` holds light placeholders for the future light theme.

| Reach for…            | Token                                      |
| --------------------- | ------------------------------------------ |
| gold / brass accent   | `--primary` (`text-primary`, `bg-primary`) |
| spark / live / urgent | `--ember` (reserved marquee accent)        |
| win / positive        | `--success`                                |
| loss / negative       | `--destructive`                            |
| caution / push        | `--warning`                                |
| muted neutral         | `--muted-foreground`                       |
| surfaces              | `--background` → `--card` → `--popover`    |

### Typography

A semantic ramp that bundles size + line-height + weight, so a surface picks one token
instead of re-tuning three. Primitive sizes (`text-xs…text-9xl`) remain Tailwind's.

| Token          | Use                                        |
| -------------- | ------------------------------------------ |
| `text-stat`    | the big numeral — scores, cover %, totals  |
| `text-title`   | card / section heading                     |
| `text-eyebrow` | all-caps section kicker (carries tracking) |

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
reads the layering** — hence deeper, blacker dark shadows. Every elevation token carries
a light value too, so the future light theme flips without touching call sites.

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
