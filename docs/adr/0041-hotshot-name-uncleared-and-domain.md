# ADR-0041: Hotshot stays but is uncleared — `hotshotpickem.com` and the commercialization gate

- Status: Accepted
- Date: 2026-08-27
- Issue: #677
- Supersedes: [ADR-0027](0027-rebrand-sunday-bets-to-hotshot.md) — the
  `hotshotcalls.com` domain clause (including the domain-only "Calls" rule) and the
  "de-gambles the identity" benefit claim; and the restatements of that same
  domain-only rule in [ADR-0034](0034-simplified-hotshot-logo-mark.md) (the
  `Supersedes:` header and the "Everything else ADR-0027 decided" paragraph). The
  product name **Hotshot**, ADR-0034's mark, and the charcoal / brass-gold / cream
  palette are unchanged.

## Context

[ADR-0027](0027-rebrand-sunday-bets-to-hotshot.md) renamed Sunday Bets → **Hotshot**
and locked `hotshotcalls.com` as the domain. Its central justification is that the
rename **"de-gambles the identity (unblocks store/ad policy)."** Scoping #661 on
2026-07-15 surfaced evidence cutting directly against that claim, and #661 separately
cannot ship a domain while the ADR names one the product no longer wants. Both threads
land here.

**The name is not as clean as ADR-0027 assumed.**

- **`HOT SHOT` is an active Light & Wonder federal registration** (cited as reg.
  5,306,551) covering gaming software, casino-game contests and tournaments, and games
  delivered via computers, mobile devices, and social platforms. Light & Wonder also
  operates a live **Hot Shot Casino** mobile app on both stores. "Hotshot" and "Hot
  Shot" are phonetically identical, and the USPTO does not require identical spelling
  to find likelihood of confusion. The name chosen to escape wagering signals is
  phonetically identical to a casino slot brand.
- **Adjacent marketplace occupants:** _Hotshot Soccer Tips_ (a live sports-betting
  predictions app, 50k+ downloads), _Hotshot Jackpot_ (predictive pick'em
  competitions), and **`HotShot™ Pro`** (EngineeringPeople, a basketball-training app
  asserting a TM — the nearest neighbour to this product's space).
- **The bare name is unavailable on the App Store.** A live [Hotshot](https://apps.apple.com/us/app/hotshot/id6475613316)
  listing (Natural Synthetics Inc., AI video) holds it, and its title is padded with
  invisible RTL/spacer characters — the fingerprint of working around a held name.
  App Store _listing_ names are globally unique; home-screen _display_ names are not.

None of this is a copyright question — the Copyright Office does not protect names or
short phrases (Circular 33). It is a **trademark** question, and answering it properly
is attorney work.

**The rename question got a complete search, and it closed.** Between 2026-07-16 and
2026-07-18, roughly 100 candidates were screened across every tier and structure: four
suggestive/descriptive lanes (~60 names), the arbitrary tier (20), real swagger
compounds (12), the slate/lock families (6), invented fusions (12), plus the league and
sharp/ball/line families. Decision rule: a challenger had to **tie-or-beat Hotshot on
vibe and screen materially cleaner than its baseline**. Three findings matter here:

- **The category namespace is exhausted.** 0 of 29 bare `.com`s checked were
  available, so every viable name needs a qualifier domain exactly as Hotshot does —
  the domain axis is a tie, which materially weakens the case for renaming.
- **The collision was structural, not bad luck.** Casino slots are named in precisely
  the swagger-compound vocabulary Hotshot lives in — Big Shot, Top Dog, Dead Eye, and
  _Hot Streak_, itself an SG Gaming / Light & Wonder filing on games-of-chance
  software. "Hot + X" is L&W franchise vocabulary. Any name in that field would have
  collided.
- **The more product-true the name, the more certainly it is taken.** BRAGGING RIGHTS
  is an active registration covering _"software for creating and placing wagers with
  friends and others on the internet"_ — the wagering version of this exact product.

Two candidates passed the full rule — **Haymaker** (cleanest real word screened) and
**Gloatworthy** (the only name whose bare `.com` was free) — with Chirp, Smug,
PaperChamp and HailMary in a clean second tier. The remaining question was a taste
call, and it was made: **no challenger was worth the rebrand.**

**Decision drivers.**

- **Exposure scales with commerce, not with code.** Trademark enforcement runs on use
  in commerce and marketplace confusion. A private, invite-only, unmarketed,
  unmonetized app with no store listing is not meaningfully in the marketplace. A
  public or monetized launch is.
- **Reversibility is origin-bound and decays with users.** PWA installs and push
  subscriptions are origin-scoped: a domain migration orphans every install and
  silently kills every `push_subscriptions` row. At 25–50 friends that is a survivable
  reinstall. At 5,000 users it is not.
- **Cost proportionality.** A full federal + state + common-law clearance search runs
  ~$1–3k — disproportionate for a pre-revenue friends app today, and appropriate
  before a public launch. The USPTO itself recommends searching all three.
- **Deadline.** Beta targets preseason, and the launch-blocking SMTP work in #661
  requires an owned domain. Legal clearance cannot sit on that critical path.

## Decision

**Keep the wordmark "Hotshot," move the domain, and make the uncleared status an
explicit, gated, dated fact rather than a silent assumption.**

1. **The wordmark stays "Hotshot."** ADR-0027's rename is confirmed with
   tier-complete finality: the name survived a search that fished every trademark
   strength tier and every naming structure. This is not a default — it is a
   ratification.

2. **The domain becomes `hotshotpickem.com`,** superseding ADR-0027's
   `hotshotcalls.com` clause. "Calls" reads as betting-tout vocabulary ("calls of the
   week"); "pick'em" is a contest-category term that distinguishes the goods and
   services from casino gaming and reads defensibly to a store reviewer.

3. **ADR-0027's domain-only rule is preserved, not overturned — only the word
   changes.** The qualifier lives in the URL and in the store listing name; it must
   **not** appear in the wordmark, page titles, persona, or body copy. The rule turns
   out to be load-bearing beyond domains: because App Store _listing_ names must be
   unique while _home-screen display_ names need not be, the qualifier does double
   duty. The listing would be **"Hotshot Pick'em"**; the icon still reads **Hotshot**.

4. **"Hotshot" is formally UNCLEARED.** This is a recorded status, not a caveat.
   The following are **gated on attorney clearance** and may not proceed without it:
   - App Store or Play Store filing;
   - public marketing (anything beyond invite-only distribution to known people);
   - monetization of any kind.

   The **private, invite-only beta is explicitly not gated** and proceeds on
   `hotshotpickem.com` today.

5. **The gate carries a date, not only triggers.** Attorney clearance is scheduled for
   the **January 2027 offseason**, ahead of any store filing, whether or not a
   commercialization trigger has fired by then. Event triggers alone would let the
   question drift until it fires mid-season; a forced rename must land in the annual
   quiet window, when there is no live competition to orphan.

6. **ADR-0027's de-gambling claim is corrected.** The rename does not de-gamble the
   identity as cleanly as that ADR asserts: HOTSHOT collides with a casino-gaming
   mark, and the swagger-compound field it sits in is slot-branding territory
   generally. Dropping "Bets" from the name is still a real gain against store and ad
   policy; the claim is narrower than ADR-0027 states, not void.

7. **"Pick'em" is positioning, not a cure.** As a category-descriptive term it would
   almost certainly be disclaimed in any application, leaving HOTSHOT as the dominant
   element — so the HOTSHOT vs HOT SHOT likelihood-of-confusion analysis is unchanged
   by it. The qualifier must not be read as buying down legal risk.

8. **The plan-B bench** — names to pivot to if clearance kills Hotshot — is
   **Haymaker**, **Gloatworthy**, Chirp, Smug, Braggart, Brash, Laces Out, Pecking
   Order. Haymaker and Gloatworthy are the two that passed the full decision rule and
   head the list. The bench is recorded so a forced rename starts from a screened
   shortlist rather than a blank page; every one of them still requires its own
   clearance.

**Not legal advice.** All screening behind this decision was web and app-store
research with weak DNS domain signals — **not** a USPTO TESS pull. The Light & Wonder
registration is cited from preliminary research and has **not** been independently
verified here. Verifying it, and running the federal / state / common-law search, is
attorney work and is the precondition for lifting the gate in ruling 4.

## Consequences

- **Helpful:** #661 and the launch-blocking SMTP work unblock immediately; $11.25
  holds a call option on the name; the beta runs on the domain the product keeps if the
  name survives; and a silent, undocumented legal assumption is replaced by an explicit
  gate with a date on it. The naming question is closed with no regret left on the
  table — every tier and structure has been searched, and re-opening it needs new
  facts, not a new brainstorm.
- **Costs:** the beta cohort is a bet. If clearance kills "Hotshot," 25–50 people
  reinstall the PWA and re-subscribe to push, and the rebrand cost — copy, assets,
  domain, docs — is real though bounded. The clearance bill is **deferred, not
  avoided**. The name/domain split remains a rule contributors must remember; only the
  word it hinges on changed.
- **Rollback (forced rename):** buy the replacement domain, re-point Vercel, update the
  Supabase Site URL and redirect allowlist, re-verify the Resend sending domain, and
  redeploy. `push_subscriptions` self-heals via `push.ts` pruning, but every user must
  re-subscribe and re-install.

## Alternatives considered

- **Clear the name now, then proceed.** Safest legally, and rejected on timing: a
  $1–3k, multi-week legal process on the critical path of a ~3-week preseason deadline
  likely misses the season — to buy down a risk the private-beta profile does not yet
  carry. Ruling 5 keeps this option, on a date, rather than discarding it.
- **Rename now, pre-emptively.** Avoids the conflict entirely and was given the most
  thorough hearing of any option — ~100 candidates across every tier. Rejected: no
  challenger both tied Hotshot on vibe and screened materially cleaner _and_ won the
  taste call; the domain axis is a tie because the namespace is exhausted; and every
  replacement would still need its own clearance. Haymaker and Gloatworthy were the
  genuine near-misses and are now the plan-B bench (ruling 8).
- **Keep ADR-0027 exactly as written** (`hotshotcalls.com`, no clearance posture).
  Rejected: it leaves an ADR asserting a de-gambling benefit the HOT SHOT registration
  undercuts, keeps a tout-coded word in the URL, and leaves #661 unable to ship a
  domain at all.
- **Adopt "Hotshot Pick'em" as the product name.** Rejected for the same reason
  ADR-0027 rejected "Hotshot Calls": the qualifier exists for ownability and store-
  listing uniqueness. For a private friends app the display name is the bare word.

## Follow-up

- **#661** — buy `hotshotpickem.com`, configure Vercel + Supabase Site URL/redirects,
  and stand up Resend SMTP. This ADR is its unblocking dependency. It should also
  retire the stale `mailto:admin@hotshotcalls.com` VAPID fallback in
  `src/lib/server/push.ts` (cosmetic — `VAPID_SUBJECT` is set in prod).
- **#678** — brand the three Supabase auth email templates, once the domain lands.
- **Attorney clearance, January 2027 offseason** (ruling 5). Its outcome either lifts
  the gate in ruling 4 or triggers the rollback above against the ruling-8 bench.
- **Competitive intel, unrelated to naming:** [torchpicks.com](https://torchpicks.com/)
  surfaced during the search as a live product in this exact category — friends, picks,
  trash talk, no money. Worth a look for feature awareness.
