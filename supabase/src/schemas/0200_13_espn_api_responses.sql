-- ---------------------------------------------------------------------------
-- espn_api_responses: raw ESPN scoreboard payloads, retained for score-dispute
-- resolution and provider debugging (issue #450, ADR-0025). The ESPN sibling of
-- odds_api_responses (issue #382): grading now sources finals from ESPN, so the
-- raw bytes behind a disputed final are captured here. Append-only; never read by
-- grading (which reads games/results); admin-only via RLS below. Unlike the Odds
-- API, ESPN's scoreboard is a public endpoint with no API key in its params.
-- ---------------------------------------------------------------------------
create table if not exists public.espn_api_responses (
  id             bigint generated always as identity primary key,
  endpoint       text not null,
  fetched_at     timestamptz not null default now(),
  http_status    integer not null,
  request_params jsonb not null default '{}'::jsonb,
  body           jsonb
);
alter table public.espn_api_responses enable row level security;
