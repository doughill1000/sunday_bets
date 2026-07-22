- **#738** `/stats` defaults to the last graded season — a bare visit opens on a season in
  every month instead of flipping to Career in the offseason, and the season hero gains a
  compact "Career rating" chip linking to `/league`'s ladder, so the credibility rating is
  default-visible year-round. Career is now an explicit choice, addressable via
  `?scope=career`. routes: `/stats` · `StatsHero.svelte` · ADR-0032 (surfacing note)
