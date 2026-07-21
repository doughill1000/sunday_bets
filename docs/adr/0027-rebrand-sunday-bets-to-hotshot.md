# ADR-0027: Rebrand Sunday Bets to Hotshot

- Status: Accepted
- Date: 2026-07-08
- Issue: #231
- Supersedes: None
- Note: the locked-mark clause in Decision (the four-point-spark-and-ember
  construction) is superseded by [ADR-0034](0034-simplified-hotshot-logo-mark.md),
  which replaces it with a simplified football-plus-rising-line mark. The product
  name, domain-only "Calls" rule, and charcoal/brass-gold/cream palette below are
  unchanged.

> **⚠ Contested as of 2026-07-21 — do not read this ADR as settled. See #677.**
> Two of this ADR's clauses are under active review and are expected to be replaced by a
> superseding ADR out of issue #677:
>
> - **The name.** This ADR's central justification is that "Hotshot" **de-gambles the
>   identity (unblocks store/ad policy)**. Scoping #661 surfaced evidence cutting against
>   exactly that claim — `HOT SHOT` is an active Light & Wonder federal registration
>   covering casino-game contests and social/mobile game delivery, and "Hotshot"/"Hot Shot"
>   are phonetically identical. The bare name is also unavailable on the App Store. A
>   2026-07-16 review concluded **Hotshot stays** for now, with plan-B "Laces Out" and
>   plan-C "Pecking Order" held in reserve; the name is **not trademark-cleared**.
> - **The domain.** The `hotshotcalls.com` domain named throughout this ADR (and in the
>   "Calls" rule) is being replaced by **`hotshotpickem.com`** (#678, not yet purchased).
>   A stale `mailto:admin@hotshotcalls.com` VAPID fallback remains in
>   `src/lib/server/push.ts`; note that `VAPID_SUBJECT` is set in prod, so the fallback is
>   cosmetic. [ADR-0034](0034-simplified-hotshot-logo-mark.md) restates the old domain too.
>
> The charcoal / brass-gold / cream palette and the de-gambling _intent_ are unaffected.

## Context

The app shipped under the working name **Sunday Bets**. Two problems forced a naming
decision:

- **"Bets" mischaracterizes the product and creates policy friction.** The stake is
  bragging rights, not money — but "Bets" signals wagering, which invites App/Play
  Store and ad-policy scrutiny the product does not actually warrant.
- **"Sunday" boxes the scope in.** It ties the identity to NFL Sundays and reads
  awkwardly against any future expansion.

An earlier exploration recommended **"Callsign"**; it was dropped as off-vibe. The
name search landed in a playful, group-chat-swagger lane (Called It / Good Call / Big
Shot) and converged on **Hotshot** — the name doubles as the brag ("look at this
hotshot"), rhymes with the Commissioner's hype-and-roast voice, and matches the Hot
Hand 🔥 heater energy.

The bare word "hotshot" is heavily squatted (common word + trucking namespace), so the
app is **named** the bare word while **ownership** runs through the domain.

## Decision

Rename the product **Sunday Bets → Hotshot**.

- The product name is **"Hotshot"** — one word, used everywhere the product names
  itself (title, header, PWA manifest, persona, install/push copy, human-facing docs).
- **`hotshotcalls.com` is the domain only.** "Calls" exists in the URL for ownability
  and must **not** appear in the wordmark, page titles, persona, or body copy — only
  where a URL or address is meant (e.g. the VAPID `mailto:` subject).
- The visual identity **evolves the existing charcoal + brass-gold direction** rather
  than pivoting the palette. The locked mark is a gold pointed-oval **football + a
  central four-point gold spark with an ember-orange tip** on charcoal; "hot" is
  expressed through the gold and the ember accent. The full raster icon set
  (favicons, apple-touch, PWA 192/512 + maskable, `logo-mark`) is regenerated from
  this mark (the browser tab uses the `.ico`). An `--ember: #e1842f` token is added to
  the dark palette, reserved for future live/urgent moments.

Explicitly **out of scope** for the rename: ADRs, the changelog, archived docs, and
seeded fixtures where "Sunday Bets" is a historical proper noun or a fictional league's
name; the repository/directory name; and the public `/demo` season snapshot's frozen
data (its fictional league is named "Sunday Bets" — a generated artifact per
[ADR-0026](0026-public-demo-season-snapshot.md), refreshed only through its own
pipeline).

## Consequences

- **Helpful:** de-gambles the identity (unblocks store/ad policy), makes the name
  carry the core verb (a "call" is your pick), and drops the scope-limiting "Sunday".
- **Costs:** the name/domain split ("Hotshot" the name, `hotshotcalls.com` the URL) is
  a rule contributors must remember; the `/demo` snapshot temporarily shows a league
  still named "Sunday Bets" until it is regenerated (tracked as follow-up); and the
  GitHub Project / repo directory keep the old name for now (cosmetic, non-blocking).

## Alternatives considered

- **Keep "Sunday Bets".** Rejected: the wagering signal and scope box are the whole
  reason for the change.
- **"Callsign"** (prior recommendation). Rejected as off-vibe; superseded by this
  decision.
- **A full palette pivot to signal "hot"** (e.g. a red/orange rebrand). Rejected:
  the premium charcoal + brass-gold direction is already established and coupled to the
  app icon; "hot" is better carried by the gold + a restrained ember accent.
- **Use "Hotshot Calls" as the product name.** Rejected: "Calls" is only needed for
  domain ownability; for a private friends app the display name can be the bare word.

## Follow-up

- Regenerate the `/demo` season snapshot with a renamed fictional league via the
  `refresh-demo-snapshot` skill (removes the last user-visible "Sunday Bets").
- Add a vector `static/favicon.svg` of the mark and wire it ahead of the `.ico`
  fallback (this rebrand ships raster-only favicons).
- **Hotshot award** — repurpose Hot Hand 🔥 → "Hotshot", or introduce a new marquee
  "The Hotshot" (best single-week score of the season). Tracked separately.
- Domain purchase (`hotshotcalls.com` / `.app`) and any public store listing.
