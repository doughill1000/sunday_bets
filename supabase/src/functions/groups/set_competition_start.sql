-- set_competition_start: commissioner moves when competition begins for the league
-- (ADR-0037 ruling 4). SECURITY DEFINER so it can write groups.competition_starts_at even
-- though the no-client-write policy (25_policies_groups.sql) blocks direct client updates;
-- the is_commissioner check is the trust boundary, mirroring rename_group / update_group_config.
--
-- p_starts_at NULL means "start this week, from now" — resolved to the database's own now(),
-- which is race-free: a client-computed "now" could arrive a few ms behind the server clock and
-- trip the no-backdate guard below, so the client sends NULL and the DB stamps the instant. A
-- non-NULL value is a chosen future week's start_ts.
--
-- Two guards keep the boundary honest:
--   * Frozen once play has begun (competition_start_frozen) — the first eligible game has
--     already kicked off, so moving the start would add or erase settled results.
--   * A non-NULL start may not be in the past — a backdated start would pull already-played
--     games into the boundary and manufacture missed penalties for them, the defect ADR-0037
--     prevents. (NULL sidesteps this: now() is never in the past.)
--
-- Returns the stored competition start so the caller can reflect it without a re-read.
--
-- Error codes (surfaced to the caller as PostgrestError.code):
--   P0001  not authenticated
--   P0020  caller is not a commissioner of the group
--   P0031  competition start is frozen (the first eligible game has kicked off)
--   P0032  competition start cannot be in the past
create or replace function public.set_competition_start(
  p_group_id uuid,
  p_starts_at timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid;
  v_start  timestamptz;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  if not public.is_commissioner(p_group_id) then
    raise exception 'caller is not a commissioner of this group' using errcode = 'P0020';
  end if;

  -- Ruling 4: no move once the first eligible game has kicked off.
  if public.competition_start_frozen(p_group_id) then
    raise exception 'competition start is frozen: play has already begun'
      using errcode = 'P0031';
  end if;

  -- No backdating a chosen date; NULL resolves to now() (never past, race-free).
  if p_starts_at is not null and p_starts_at < now() then
    raise exception 'competition start cannot be in the past' using errcode = 'P0032';
  end if;

  v_start := coalesce(p_starts_at, now());

  update public.groups
  set competition_starts_at = v_start
  where id = p_group_id;

  return v_start;
end;
$$;

revoke execute on function public.set_competition_start(uuid, timestamptz) from public, anon;
