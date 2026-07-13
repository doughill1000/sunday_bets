-- ---------------------------------------------------------------------------
-- player_ratings
-- Cross-season "who knows ball" credibility rating read model (issue #361, ADR-0032).
-- ONE row per (group_id, user_id) carrying a rating on the 1500-centered ELO scale.
--
-- This is a persisted READ MODEL, never a source of truth. It is rebuilt from scratch out of
-- public.pick_settlement by a pure TypeScript fold ($lib/server/rating) in the same post-grade
-- step that refreshes the stats matviews, mirroring ADR-0013's recompute / self-heal contract
-- (ADR-0032 §8). It can always be regenerated from pick_settlement; a rebuild failure is logged,
-- not thrown, and self-heals on the next grade. The fairness-critical MATH lives in TS (pure,
-- unit-tested, never AI-decided); this table only stores its output.
--
-- Access: service-role ONLY. Reads go through the service-role stats composer, filtered by
-- group_id (the ADR-0013 read-model pattern) — no client ever selects this table directly. RLS is
-- enabled with NO policy (deny-all to anon/authenticated), and player_ratings_grants.sql strips the
-- default anon/PUBLIC ACL Supabase auto-grants on new tables. That is a STRICTER posture than the
-- stats matviews (which cannot carry RLS at all) while honoring ADR-0032 §8's service-role-only
-- intent; there is deliberately no permissive policy because there is no client access path.
-- ---------------------------------------------------------------------------
create table if not exists public.player_ratings (
  group_id     uuid not null,
  user_id      uuid not null,
  -- Credibility rating on the 1500 scale; NULL while the player is Unrated (below the ~20
  -- settled-decision qualification gate, ADR-0032 §5). A NULL rating IS the Unrated state.
  rating       int,
  -- Settled career spread decisions counted into the rating (missed excluded, ADR-0032 §3).
  decisions    int not null default 0,
  -- Settled decisions still needed to qualify; 0 once rated. Drives the "N to go" progress hint.
  decisions_to_qualify int not null default 0,
  -- Movement during the current (latest) season after its soft reset — the "this season" arrow.
  -- NULL while Unrated.
  season_delta int,
  -- Stamp of the rebuild that wrote this row; the rebuild prunes rows older than its own run.
  computed_at  timestamptz not null default now(),
  constraint player_ratings_pkey primary key (group_id, user_id)
);

-- RLS as defense in depth (repo convention for every public table). service_role bypasses RLS;
-- with no permissive policy, anon/authenticated see zero rows even if a grant ever leaked. The
-- (group_id, user_id) primary key already serves the group_id-scoped read (leading column), so
-- no secondary index is needed.
alter table public.player_ratings enable row level security;
