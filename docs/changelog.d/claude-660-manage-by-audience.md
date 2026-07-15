- **#660** Re-organize `/league/manage` by audience — it becomes a commissioner-only
  console (one flat scroll, no tab bar) and the personal knobs (AI recap opt-out, Leave
  league) move to `/settings`, beside the other per-user preferences. The Members/Manage
  tabs split the page by audience rather than topic, so members were sent to a page that
  had nothing for them. A `Commissioner` marker on the `/league` standings row now tells
  everyone who runs the league. routes: `/league`, `/league/manage`, `/settings` ·
  ADR-0017 / ADR-0030
