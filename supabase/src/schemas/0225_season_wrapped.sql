-- SEASON_WRAPPED: the season edition of ai_recaps (#347, ADR-0008 boundary 5). One row
-- per subject per group per completed season — scope 'league' (subject_user_id null) or
-- scope 'player' (one per active player). Stores the AI-generated prose and the
-- deterministic facts packet that produced it.
-- RLS: group members read their own group's rows; all writes via service role.
create table if not exists public.season_wrapped (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups(id) on delete cascade,
  season_year       integer not null,
  scope             text not null check (scope in ('player', 'league')),
  subject_user_id   uuid references public.users(id) on delete cascade,
  prose             text not null,
  facts             jsonb not null,
  is_fallback       boolean not null default false,
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz not null default now(),
  -- league rows have no subject; player rows must name one.
  constraint season_wrapped_subject_scope check (
    (scope = 'league' and subject_user_id is null)
    or (scope = 'player' and subject_user_id is not null)
  )
);

-- Dedup must be enforced with partial unique indexes, NOT a single UNIQUE over
-- (group_id, season_year, scope, subject_user_id): Postgres treats NULLs as distinct in
-- unique constraints, so league rows (subject_user_id null) would never collide and could
-- duplicate. One partial index per scope keeps both idempotent.
create unique index if not exists ux_season_wrapped_player
  on public.season_wrapped (group_id, season_year, subject_user_id)
  where scope = 'player';

create unique index if not exists ux_season_wrapped_league
  on public.season_wrapped (group_id, season_year)
  where scope = 'league';
