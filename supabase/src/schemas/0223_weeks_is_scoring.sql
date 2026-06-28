-- Non-scoring rounds (ADR-0016). Single source of truth for whether a round's graded
-- settlements count toward standings/stats. Defaults true so every existing regular week
-- keeps counting; a "practice"/"fun" or preseason round sets it false. Orthogonal to the
-- sign of week_number, which remains only the odds preseason sport-key signal.
alter table public.weeks
  add column if not exists is_scoring boolean not null default true;

-- Close the legacy preseason leak: any pre-existing negative-week (preseason) row predating
-- this flag must not count. New preseason weeks are written is_scoring=false by the schedule
-- sync. Idempotent re-run is harmless.
update public.weeks set is_scoring = false where week_number < 0;
