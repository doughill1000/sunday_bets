-- create_group: gated, atomic group creation (ADR-0006, decision 3).
--
-- The whole function runs in a single transaction, so a failure at any step
-- (gate rejection, constraint violation) leaves no orphan group, config, or
-- membership. SECURITY DEFINER lets it write groups / group_config /
-- group_memberships even though those tables block direct client writes; the
-- trust check is the gate below, keyed on the caller's auth.uid().
--
-- Competition start (ADR-0039, superseding ADR-0037 ruling 5): a new league always begins
-- at now(). Joining is the only participation boundary, so there is no start-week argument
-- to carry — groups.competition_starts_at keeps its `not null default now()` and the
-- creator's own membership joined_at defaults to the same instant, which makes
-- greatest(competition_starts_at, joined_at) = joined_at for every member. Games that
-- kicked off before a member joined never count against them; everything from their join
-- forward does, immediately.
--
-- Error codes (surfaced to the caller as PostgrestError.code):
--   P0001  not authenticated
--   P0010  group name is required
--   P0011  group name too long
--   P0012  group creation not enabled for this account (gated mode)
create or replace function public.create_group(p_name text)
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

  -- Atomic create: group, then its seeded config, then the creator as commissioner.
  -- competition_starts_at is left to its column default (now()), which is the only start a
  -- league can have — no already-played game is ever eligible for a brand-new league.
  insert into public.groups (name)
  values (v_name)
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

revoke execute on function public.create_group(text) from public, anon;
