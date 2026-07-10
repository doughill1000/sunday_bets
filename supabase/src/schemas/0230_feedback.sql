-- ---------------------------------------------------------------------------
-- feedback
-- In-app feedback / bug reports (issue #500, ADR-0028). Store-first: a submission
-- writes exactly one row here; filing to GitHub is a separate, admin-gated step
-- (delivered in the admin-queue follow-up). User-scoped, NOT group-scoped — a
-- deliberate departure from ADR-0002: a row is owned by its submitter and visible
-- to that submitter plus the global admin (the triage inbox).
-- RLS: owner INSERT/SELECT own; admin SELECT all + UPDATE (triage). Hot-path inserts
-- run through the service role (POST /api/feedback), which bypasses RLS.
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id               uuid primary key default gen_random_uuid(),
  -- SET NULL (not CASCADE) on user delete: keep a report that may already be filed
  -- to GitHub while dropping attribution (ADR-0028).
  user_id          uuid references public.users (id) on delete set null,
  kind             text not null default 'idea'
    check (kind in ('bug', 'idea', 'confused', 'love')),
  body             text not null
    check (char_length(body) between 1 and 4000),
  -- App-agnostic capture blob (route, build id, viewport, UA, Sentry event id,
  -- season, active group, …). Kept as jsonb so the shape can evolve and the RN app
  -- can POST the same endpoint later without a schema change (ADR-0028).
  context          jsonb not null default '{}'::jsonb,
  status           text not null default 'new'
    check (status in ('new', 'triaged', 'filed', 'dismissed')),
  github_issue_url text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_feedback_user on public.feedback (user_id);
-- The admin triage queue lists newest-first, filtered by status.
create index if not exists idx_feedback_status_created
  on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;
