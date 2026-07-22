-- create_group: gated, atomic group creation (ADR-0006, decision 3).
--
-- The whole function runs in a single transaction, so a failure at any step
-- (gate rejection, constraint violation) leaves no orphan group, config, or
-- membership. SECURITY DEFINER lets it write groups / group_config /
-- group_memberships even though those tables block direct client writes; the
-- trust check is the gate below, keyed on the caller's auth.uid().
--
-- p_competition_starts_at (ADR-0037 ruling 5): when competition begins for this league.
-- NULL means "start this week, from now" — the safe default the column already carries
-- (games earlier today are already excluded); a non-NULL value lets the creator start a
-- future week (that week's start_ts). It is clamped UP to now() so a stale or hostile
-- client can never backdate a brand-new league onto games that have already been played —
-- the exact boundary defect ADR-0037 exists to prevent. Moving the start later after
-- creation is the commissioner's job via set_competition_start (ruling 4).
--
-- Error codes (surfaced to the caller as PostgrestError.code):
--   P0001  not authenticated
--   P0010  group name is required
--   P0011  group name too long
--   P0012  group creation not enabled for this account (gated mode)
create or replace function public.create_group(
  p_name text,
  p_competition_starts_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id  uuid;
  v_name     text;
  v_mode     text;
  v_capable  boolean;
  v_group_id uuid;
  v_start    timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Validate name: non-empty, length-bounded (mirrors groups_name_max_len).
  v_name := btrim(coalesce(p_name, ''));
  if length(v_name) = 0 then
    raise exception 'group name is required' using errcode = 'P0010';
  end if;
  if length(v_name) > 60 then
    raise exception 'group name too long' using errcode = 'P0011';
  end if;

  -- Gate: global mode, then per-user capability when gated.
  select group_creation_mode into v_mode
  from public.settings
  where id = true
  limit 1;
  v_mode := coalesce(v_mode, 'gated');

  if v_mode <> 'open' then
    select can_create_group into v_capable
    from public.users
    where id = v_user_id;

    if not coalesce(v_capable, false) then
      raise exception 'group creation is not enabled for this account'
        using errcode = 'P0012';
    end if;
  end if;

  -- Clamp the competition start up to now(): NULL keeps the column default (now()), and a
  -- provided-but-past value is pulled forward so no already-played game becomes eligible.
  v_start := greatest(now(), coalesce(p_competition_starts_at, now()));

  -- Atomic create: group, then its seeded config, then the creator as commissioner.
  insert into public.groups (name, competition_starts_at)
  values (v_name, v_start)
  returning id into v_group_id;

  -- Seed group_config from global settings, reusing the shape established by
  -- 0213_seed_original_group_config.sql so every group starts consistently.
  insert into public.group_config (group_id, line_source, scoring_rules)
  values (
    v_group_id,
    'fanduel',
    jsonb_build_object(
      'missed_pick_penalty',
      coalesce((select missed_pick_penalty from public.settings where id = true limit 1), -1)
    )
  );

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, v_user_id, 'commissioner', 'active');

  return v_group_id;
end;
$$;

revoke execute on function public.create_group(text, timestamptz) from public, anon;
