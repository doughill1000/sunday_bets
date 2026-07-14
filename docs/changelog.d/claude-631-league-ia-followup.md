- **#631** League home's two tabs are now fully self-contained: honors and the Members & manage
  card used to render after `</Tabs>` and so appeared under both Standings and Week alike, and the
  season/All-time picker duplicated itself between the global scope bar and honors' own
  `SeasonPicker`. Each tab now owns exactly one context control inside its own panel — Standings
  keeps the season/All-time select, Week gets a new `WeekNavigator` lifted above the hardware it
  drives — and Manage moved to a heading action. Weekly is relabelled **Week** (still shows one
  week, never had a trend) and now leads with that week's hardware plus a link into `/recap`
  instead of an inline `RecapCard`. `/recap` itself gets a door: League honors' "Season recaps"
  CTA and every Week tab's hardware recap link, both deep-linking to `#week-N` anchors. In
  passing, the weekly "Sharp of the Week" award is renamed **Game Ball of the Week** — "Sharp"
  already named the season badge `the-sharp` and the /stats credibility tier (ADR-0032), and a
  shelf chip claimed a kinship with a person's rating tier that didn't exist. The award id is
  derived on read (never persisted), so no data migration. files: league/+page.svelte ·
  LeagueHonors.svelte · WeeklyHardware.svelte · WeekNavigator.svelte (new) · weekLabel.ts (new) ·
  recap/+page.svelte · weeklyAwards.ts
