-- Seed group_config for the original "Sunday Bets" group.
-- Copies gameplay-relevant settings from the global settings table into the
-- group-owned config row. Operational settings (quota caps, reset dates) stay global.
-- Safe to re-run: ON CONFLICT updates scoring_rules from current global settings.
insert into public.group_config (group_id, line_source, scoring_rules)
select
  '00000000-0000-4000-8000-000000000017'::uuid,
  'fanduel',
  jsonb_build_object(
    'missed_pick_penalty',
    coalesce(
      (select missed_pick_penalty from public.settings where id = true limit 1),
      -1
    )
  )
on conflict (group_id) do update set
  scoring_rules = excluded.scoring_rules,
  updated_at    = now();
