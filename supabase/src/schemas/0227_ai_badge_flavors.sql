-- AI_BADGE_FLAVORS: the badge edition of ai_recaps (#416, epic #283 Wave 3, ADR-0008
-- boundary 5). One row per awarded badge per group per COMPLETED season — the personalized,
-- AI-voiced tagline that overrides the hardcoded static FLAVORS slot in
-- src/lib/domain/badges.ts. The award itself stays deterministic (computeBadges); only the
-- voice is stored here. Stores the generated flavor and the deterministic facts packet that
-- produced it.
-- RLS: group members read their own group's rows; all writes via service role.
create table if not exists public.ai_badge_flavors (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups(id) on delete cascade,
  season_year       integer not null,
  badge_id          text not null,
  flavor            text not null,
  facts             jsonb not null,
  is_fallback       boolean not null default false,
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz not null default now(),
  -- One flavor per badge per group per season. A full UNIQUE (no NULLs in the key) can serve
  -- as the PostgREST on_conflict arbiter, so the query layer upserts on this tuple.
  unique (group_id, season_year, badge_id)
);
