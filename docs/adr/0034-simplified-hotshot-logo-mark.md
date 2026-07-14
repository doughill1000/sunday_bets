# ADR-0034: Simplified Hotshot logo mark (football + rising line)

- Status: Proposed
- Date: 2026-07-13
- Issue: #621
- Supersedes: ADR-0027 (the locked-mark clause in Decision only; the product name
  "Hotshot", the `hotshotcalls.com` domain-only "Calls" rule, and the charcoal /
  brass-gold / cream palette are retained unchanged)

## Context

[ADR-0027](0027-rebrand-sunday-bets-to-hotshot.md) locked the Hotshot mark as a gold
pointed-oval football with a central four-point gold spark and an ember-orange tip on
charcoal. In production use across the browser tab (16px), app header, auth lockup,
PWA/home-screen icons, and push-notification artwork, that construction proved too
detailed to hold up small: the double arcs, yard marks, thin ornamental strokes, and
the four-point spark compete with each other well before 24px, and the ember-orange
tip adds a second accent color the small sizes can't resolve cleanly.

Doug explored a simplified direction and approved it (concept renders saved on
`codex/621-logo-concepts` at `docs/assets/issue-621/logo-mark-concept.png` and
`hotshot-lockup-concept.png`): a closed, pointed American-football outline in brass
gold, simple cream laces above center, and one restrained brass angular rising line in
the lower third — no spark, star, flame, arrowhead, checkmark, or ember accent. The
football stays the dominant silhouette; the rising line is visually lighter, sits
lower, and ends inside the right edge with a plain rounded cap. Because ADR-0027's
Decision section names the four-point-spark-and-ember construction explicitly, this
mark change requires a superseding ADR rather than a routine asset update.

## Decision

Replace the locked Hotshot mark from ADR-0027 with the simplified
football-plus-rising-line construction, within ADR-0027's existing charcoal, brass-gold,
and cream palette:

- **Mark geometry:** a closed, pointed football outline (brass gold), simple cream
  laces above center, and one restrained brass angular rising line in the lower third.
  No four-point spark, star, flame, arrowhead, checkmark, or ember-orange endpoint. The
  football is the dominant silhouette — heavier and simpler than ADR-0027's version,
  with no side yard marks, inner double arcs, thin ornamental details, gradients,
  bevels, or glow effects.
- **`--ember` token:** remains defined in the dark palette for future live/urgent
  moments (per ADR-0027) but is **not** used in this mark.
- **Lockup:** the stacked auth lockup places the refined mark above an uppercase
  HOTSHOT wordmark, spells the name exactly once, and drops the prior
  underline/dot treatment.
- **Canonical sources:** `static/logo-mark.svg` and a new `static/hotshot-lockup.svg`
  are the deterministic vector sources of truth. Every raster derivative (favicons,
  ICO, Apple touch icon, PWA 192/512/1024, maskable 512, `logo-mark.png`,
  `hotshot-lockup.png`) is regenerated from those vectors in one pass so the family
  cannot drift.
- **Vector favicon:** a `static/favicon.svg` is linked ahead of the existing `.ico`
  fallback (this also fulfills the vector-favicon follow-up ADR-0027 deferred).
- **Asset URLs:** existing filenames/paths are preserved where practical so current
  consumers (manifest, `app.html`, notification payloads) keep working without a
  reference update pass.

Everything else ADR-0027 decided — the product name **Hotshot**, the domain-only
"Calls" rule for `hotshotcalls.com`, and the charcoal + brass-gold + cream palette — is
unchanged and out of scope here.

## Consequences

- **Helpful:** the mark reads cleanly at 16px (browser tab) and 24px (demo nav) where
  the prior construction muddied; one accent color (brass gold on charcoal, cream
  laces) instead of two (gold + ember) simplifies every derived asset; single-source
  vectors make the full icon family regenerate deterministically instead of by hand
  per surface.
- **Costs:** every consumer of the old mark (header, auth screen, PWA manifest, Apple
  touch icon, push notifications, `/demo` nav) needs its raster regenerated in this
  change; anywhere the four-point spark or ember tip was referenced in design docs or
  screenshots becomes stale and needs a follow-up sweep; the public `/demo` snapshot is
  a frozen artifact (ADR-0026) and will show the old mark until its own refresh
  pipeline runs.

## Alternatives considered

- **Keep ADR-0027's mark and only shrink/simplify the raster export.** Rejected: the
  spark-and-ember detail is inherent to the vector construction, not an export
  artifact — it cannot be simplified away without changing the mark itself.
- **Drop the football and use an abstract mark (pure rising line, wordmark-only).**
  Rejected: the football silhouette is the strongest existing brand recognition asset;
  discarding it trades a legibility problem for a starting-from-zero recognition
  problem.
- **Introduce a second accent color for the rising line instead of reusing brass
  gold.** Rejected: a second hue is exactly the small-size legibility problem being
  fixed; ADR-0027's palette already has no unused accent color to spend here besides
  the reserved `--ember` token, which this issue explicitly excludes from the mark.

## Follow-up

- Implementation of issue #621: canonical SVG sources, full raster regeneration, and
  the vector-favicon wire-up.
- Sweep design docs/screenshots that show the old four-point-spark mark for staleness
  once the new assets ship (`docs/DESIGN.md`, `docs/agent-context/design-system.md` if
  either embeds the old mark).
- Regenerate the `/demo` season snapshot (`refresh-demo-snapshot` skill) once a
  demo-worthy reason to touch it arises; this ADR does not force that refresh on its
  own (issue #621 explicitly excludes the demo snapshot from scope).
