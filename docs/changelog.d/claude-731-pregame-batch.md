- **#731** Reshape the pregame pushes — the line-shift alert now fires only on a fresh
  near-kickoff jump against your picked side (measured against the previous synced line,
  naming the side and the size of the move), and it is delivered together with the pick
  reminder as a single consolidated push ~90 min before kickoff instead of two separate
  buzzes in different windows. `/api/cron/pregame`.
