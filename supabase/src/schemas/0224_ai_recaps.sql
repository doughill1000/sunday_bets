-- AI_RECAPS: one row per group per graded week. Stores the AI-generated prose and
-- the deterministic facts packet that produced it (ADR-0008 boundary 5).
-- RLS: group members read their own group's recaps; all writes via service role.
create table if not exists public.ai_recaps (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups(id) on delete cascade,
  season_year    integer not null,
  week_number    integer not null,
  prose          text not null,
  facts          jsonb not null,
  is_fallback    boolean not null default false,
  model          text,
  prompt_tokens  integer,
  completion_tokens integer,
  created_at     timestamptz not null default now(),
  unique (group_id, season_year, week_number)
);
