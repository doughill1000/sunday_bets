- **#647** Cut four season badges that measured something other than their label — The
  Homer (a trait the format can't express), The Nemesis (cover rate in disguise), Big Game
  Hunter (conviction volume, not conviction that paid) and Hot Hand (luck). The catalog
  drops 19 → 15. files: `src/lib/domain/badges.ts` · `src/lib/types/honors.ts` ·
  ADR-0035 (amended: badges must be able to say "nobody"; where does your zero come from;
  one measure, one surface)
- **#648** The verdict badges get the bar they shipped without, so each can honestly
  resolve to nobody — The Whale now requires a _winning_ All-In record, The Choker becomes
  a shutout milestone, The Oracle and The Lemming get rate bars, and The Lemming gets a
  guard scaled off its own denominator. The Lemming no longer crowns a player with a
  winning record. files: `src/lib/domain/badges.ts` · ADR-0035 §2
- **#649** Both lean axes take a league-mean zero, measured against the room that season
  rather than an invented absolute — Lone Wolf / The Sheep come out of the dark on fade
  rate, and Dog Lover stops firing every single season. files: `src/lib/domain/badges.ts` ·
  `src/lib/components/group/LeagueHonors.svelte` · ADR-0035 §4
- **#651** The Grinder becomes an attendance milestone ("missed nothing all season",
  gated to seasons that recorded attendance) and tied weeks credit nobody, so the alphabet
  no longer decides either. files: `src/lib/domain/badges.ts` ·
  `src/lib/server/recap/badgeFlavorFacts.ts` · ADR-0035 §4
