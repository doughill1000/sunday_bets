-- ---------------------------------------------------------------------------
-- odds_api_responses: raw Odds API payloads, retained for dispute resolution
-- and provider debugging (issue #382). Append-only; never read by grading,
-- which continues to read game_lines/results. Admin-only via RLS below.
-- ---------------------------------------------------------------------------
create table if not exists public.odds_api_responses (
  id             bigint generated always as identity primary key,
  endpoint       text not null,
  fetched_at     timestamptz not null default now(),
  http_status    integer not null,
  request_params jsonb not null default '{}'::jsonb,
  body           jsonb
);
alter table public.odds_api_responses enable row level security;
