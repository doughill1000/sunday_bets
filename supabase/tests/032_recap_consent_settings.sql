-- 032_recap_consent_settings.sql
-- pgTAP for update_group_recap_settings + update_recap_opt_out (issue #301).
-- ADR-0008 (consent/tone model) · ADR-0002 (tenancy) · ADR-0011 (grant baseline).
--
-- Acceptance criteria verified here:
--   1. Both functions exist with the expected signatures.
--   2. Commissioner can set spice; non-commissioner is blocked (P0020).
--   3. Commissioner can toggle ai_recaps_enabled; non-commissioner is blocked (P0020).
--   4. Any member (incl. commissioner) can toggle their own ai_recap_opt_out.
--   5. A member cannot toggle another group's opt-out (P0010 — not a member).
--   6. group_config.spice accepts only 'mild' | 'medium' | 'spicy'.

begin;

select plan(14);

-- ── Schema sanity ─────────────────────────────────────────────────────────────

select has_function(
  'public', 'update_group_recap_settings',
  array['uuid','text','boolean'],
  'update_group_recap_settings(uuid, text, boolean) exists'
);

select has_function(
  'public', 'update_recap_opt_out',
  array['uuid','boolean'],
  'update_recap_opt_out(uuid, boolean) exists'
);

select has_column('public', 'group_config',     'spice',            'group_config has spice');
select has_column('public', 'group_config',     'ai_recaps_enabled','group_config has ai_recaps_enabled');
select has_column('public', 'group_memberships','ai_recap_opt_out', 'group_memberships has ai_recap_opt_out');

-- ── Seed fixtures ─────────────────────────────────────────────────────────────

select tests.create_supabase_user('rcs_commissioner');
select tests.create_supabase_user('rcs_member');
select tests.create_supabase_user('rcs_outsider');

insert into public.users (id, role, display_name)
values
  (tests.get_supabase_uid('rcs_commissioner'), 'player', 'RCS Commissioner'),
  (tests.get_supabase_uid('rcs_member'),       'player', 'RCS Member'),
  (tests.get_supabase_uid('rcs_outsider'),     'player', 'RCS Outsider')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name)
values
  ('00000000-0000-4032-8000-000000000001', 'RCS Group A'),
  ('00000000-0000-4032-8000-000000000002', 'RCS Group B (outsider)');

insert into public.group_memberships (group_id, user_id, role)
values
  ('00000000-0000-4032-8000-000000000001', tests.get_supabase_uid('rcs_commissioner'), 'commissioner'),
  ('00000000-0000-4032-8000-000000000001', tests.get_supabase_uid('rcs_member'),       'member'),
  ('00000000-0000-4032-8000-000000000002', tests.get_supabase_uid('rcs_outsider'),     'member');

insert into public.group_config (group_id, line_source, scoring_rules, grading_preset)
values
  ('00000000-0000-4032-8000-000000000001', 'fanduel', '{}', 'house'),
  ('00000000-0000-4032-8000-000000000002', 'fanduel', '{}', 'house');

-- ── 2. Commissioner sets spice ────────────────────────────────────────────────

select tests.authenticate_as('rcs_commissioner');

select lives_ok(
  $$ select public.update_group_recap_settings('00000000-0000-4032-8000-000000000001', 'spicy', null) $$,
  'commissioner can set spice'
);

select results_eq(
  $$ select spice from public.group_config where group_id = '00000000-0000-4032-8000-000000000001' $$,
  $$ values ('spicy'::text) $$,
  'spice was written'
);

-- ── 2b. Non-commissioner blocked from setting spice ───────────────────────────

select tests.authenticate_as('rcs_member');

select throws_ok(
  $$ select public.update_group_recap_settings('00000000-0000-4032-8000-000000000001', 'mild', null) $$,
  'P0020', null,
  'non-commissioner blocked from update_group_recap_settings (P0020)'
);

-- ── 3. Commissioner toggles ai_recaps_enabled ─────────────────────────────────

select tests.authenticate_as('rcs_commissioner');

select lives_ok(
  $$ select public.update_group_recap_settings('00000000-0000-4032-8000-000000000001', null, false) $$,
  'commissioner can disable ai_recaps_enabled'
);

select results_eq(
  $$ select ai_recaps_enabled from public.group_config where group_id = '00000000-0000-4032-8000-000000000001' $$,
  $$ values (false) $$,
  'ai_recaps_enabled written as false'
);

-- ── 4a. Member toggles their own opt-out ──────────────────────────────────────

select tests.authenticate_as('rcs_member');

select lives_ok(
  $$ select public.update_recap_opt_out('00000000-0000-4032-8000-000000000001', true) $$,
  'member can set ai_recap_opt_out = true (opt out)'
);

select results_eq(
  $$ select ai_recap_opt_out from public.group_memberships
     where group_id = '00000000-0000-4032-8000-000000000001'
       and user_id  = tests.get_supabase_uid('rcs_member') $$,
  $$ values (true) $$,
  'member ai_recap_opt_out written'
);

-- ── 4b. Commissioner can also toggle their own opt-out ────────────────────────

select tests.authenticate_as('rcs_commissioner');

select lives_ok(
  $$ select public.update_recap_opt_out('00000000-0000-4032-8000-000000000001', true) $$,
  'commissioner can set their own ai_recap_opt_out'
);

-- ── 5. Member cannot opt out of a group they do not belong to ─────────────────

select tests.authenticate_as('rcs_member');

select throws_ok(
  $$ select public.update_recap_opt_out('00000000-0000-4032-8000-000000000002', true) $$,
  'P0010', null,
  'non-member cannot call update_recap_opt_out on another group (P0010)'
);

select * from finish();
rollback;
