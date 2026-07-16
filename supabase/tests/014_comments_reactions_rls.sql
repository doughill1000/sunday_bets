-- 014_comments_reactions_rls.sql
-- pgTAP tests for group-scoped comments and reactions RLS.
-- Verifies: schema shape, cross-group denial, post-kickoff read gate, membership-
-- scoped write access, and (since #689) comment-scoped reactions: a reaction is
-- visible only when its comment is, and cascades away when the comment is deleted.

BEGIN;

SELECT plan(31);

-- ── Schema checks ─────────────────────────────────────────────────────────────

SELECT has_table('public', 'comments',  'comments table exists');
SELECT has_table('public', 'reactions', 'reactions table exists');

SELECT has_column('public', 'comments', 'group_id',   'comments has group_id');
SELECT has_column('public', 'comments', 'user_id',    'comments has user_id');
SELECT has_column('public', 'comments', 'game_id',    'comments has game_id');
SELECT has_column('public', 'comments', 'body',       'comments has body');
SELECT col_not_null('public', 'comments', 'group_id', 'comments.group_id is not null');

SELECT has_column('public', 'comments', 'deleted_at', 'comments has deleted_at');
SELECT col_is_null('public',  'comments', 'deleted_at', 'comments.deleted_at is nullable');

SELECT has_column('public', 'reactions', 'group_id',  'reactions has group_id');
SELECT has_column('public', 'reactions', 'emoji',     'reactions has emoji');
SELECT col_not_null('public', 'reactions', 'group_id','reactions.group_id is not null');

-- #689: reactions now hang off a comment, not a game.
SELECT has_column('public', 'reactions', 'comment_id', 'reactions has comment_id');
SELECT col_not_null('public', 'reactions', 'comment_id', 'reactions.comment_id is not null');
SELECT hasnt_column('public', 'reactions', 'game_id', 'reactions no longer has game_id');

-- ── Seed data (service role) ───────────────────────────────────────────────────

SELECT tests.create_supabase_user('cr_player_a');
SELECT tests.create_supabase_user('cr_player_b');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('cr_player_a'), 'player', 'CR Player A'),
  (tests.get_supabase_uid('cr_player_b'), 'player', 'CR Player B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4001-8000-0000000000a3', 'CR Group A'),
  ('00000000-0000-4001-8000-0000000000b3', 'CR Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4001-8000-0000000000a3', tests.get_supabase_uid('cr_player_a'), 'member'),
  ('00000000-0000-4001-8000-0000000000b3', tests.get_supabase_uid('cr_player_b'), 'member');

INSERT INTO public.seasons (year) VALUES (2031)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1),
  1,
  now(),
  now() + interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Two distinct team pairs: the past and future games must be different
-- matchups, since uq_games_matchup forbids two games with the same
-- (week, unordered team pair).
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('CR_HOME', 'CR Home Team', 'CRH'),
  ('CR_AWAY', 'CR Away Team', 'CRA'),
  ('CR_HOME2', 'CR Home Team 2', 'CRH2'),
  ('CR_AWAY2', 'CR Away Team 2', 'CRA2')
ON CONFLICT (external_key) DO NOTHING;

-- A past game (started) so post-kickoff reads are possible
INSERT INTO public.games (id, week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  '00000000-0000-4001-8000-000000000031',
  (SELECT id FROM public.weeks WHERE week_number = 1
     AND season_id = (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1)),
  'cr_game_past',
  now() - interval '2 hours',
  (SELECT id FROM public.teams WHERE external_key = 'CR_HOME'),
  (SELECT id FROM public.teams WHERE external_key = 'CR_AWAY')
)
ON CONFLICT (external_game_id) DO NOTHING;

-- A future game (not started) to test read gate
INSERT INTO public.games (id, week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  '00000000-0000-4001-8000-000000000032',
  (SELECT id FROM public.weeks WHERE week_number = 1
     AND season_id = (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1)),
  'cr_game_future',
  now() + interval '1 day',
  (SELECT id FROM public.teams WHERE external_key = 'CR_HOME2'),
  (SELECT id FROM public.teams WHERE external_key = 'CR_AWAY2')
)
ON CONFLICT (external_game_id) DO NOTHING;

-- Group B comment on the started game (reactions attach here).
INSERT INTO public.comments (id, group_id, user_id, game_id, body)
VALUES (
  '00000000-0000-4001-8000-0000000000c1',
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-000000000031',
  'Group B comment on past game'
);

-- Group B comment on the future game (pre-kickoff — neither it nor its reactions
-- should be readable until the game starts).
INSERT INTO public.comments (id, group_id, user_id, game_id, body)
VALUES (
  '00000000-0000-4001-8000-0000000000c2',
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-000000000032',
  'Group B comment on future game'
);

-- Group B soft-deleted comment on the started game (invisible to members).
INSERT INTO public.comments (group_id, user_id, game_id, body, deleted_at)
VALUES (
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-000000000031',
  'deleted comment in Group B',
  now()
);

-- Group B comment used only to prove reactions cascade on comment delete.
INSERT INTO public.comments (id, group_id, user_id, game_id, body)
VALUES (
  '00000000-0000-4001-8000-0000000000c3',
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-000000000031',
  'Group B comment to be deleted'
);

-- Reaction on the started-game comment (visible to Group B post-kickoff).
INSERT INTO public.reactions (group_id, user_id, comment_id, emoji)
VALUES (
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-0000000000c1',
  '🔥'
);

-- Reaction on the future-game comment (must stay hidden until kickoff).
INSERT INTO public.reactions (group_id, user_id, comment_id, emoji)
VALUES (
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-0000000000c2',
  '😬'
);

-- Reaction on the to-be-deleted comment (proves cascade).
INSERT INTO public.reactions (group_id, user_id, comment_id, emoji)
VALUES (
  '00000000-0000-4001-8000-0000000000b3',
  tests.get_supabase_uid('cr_player_b'),
  '00000000-0000-4001-8000-0000000000c3',
  '🎯'
);

-- ── Cross-group read denial (Group A member cannot see Group B content) ────────

SELECT tests.authenticate_as('cr_player_a');

SELECT results_eq(
  $$ SELECT count(*) FROM public.comments
     WHERE group_id = '00000000-0000-4001-8000-0000000000b3' $$,
  $$ VALUES (0::bigint) $$,
  'cross-group comment read returns 0 rows'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.reactions
     WHERE group_id = '00000000-0000-4001-8000-0000000000b3' $$,
  $$ VALUES (0::bigint) $$,
  'cross-group reaction read returns 0 rows'
);

-- ── Cross-group write denial ───────────────────────────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public.comments (group_id, user_id, game_id, body)
     VALUES (
       '00000000-0000-4001-8000-0000000000b3',
       tests.get_supabase_uid('cr_player_a'),
       '00000000-0000-4001-8000-000000000031',
       'sneaky cross-group comment'
     ) $$,
  '42501',
  NULL,
  'cross-group comment insert is denied'
);

-- Group A member tries to react (stamped with group B) onto a group B comment.
SELECT throws_ok(
  $$ INSERT INTO public.reactions (group_id, user_id, comment_id, emoji)
     VALUES (
       '00000000-0000-4001-8000-0000000000b3',
       tests.get_supabase_uid('cr_player_a'),
       '00000000-0000-4001-8000-0000000000c1',
       '👍'
     ) $$,
  '42501',
  NULL,
  'cross-group reaction insert is denied'
);

-- ── Post-kickoff read gate: future game comment is not readable ───────────────

SELECT results_eq(
  $$ SELECT count(*) FROM public.comments
     WHERE game_id = '00000000-0000-4001-8000-000000000032'
       AND group_id = '00000000-0000-4001-8000-0000000000a3' $$,
  $$ VALUES (0::bigint) $$,
  'pre-kickoff comments on future game return 0 rows for group A member'
);

-- ── Group B member can read own group past-game content ───────────────────────

SELECT tests.clear_authentication();
SELECT tests.authenticate_as('cr_player_b');

SELECT results_eq(
  $$ SELECT count(*) FROM public.comments
     WHERE group_id = '00000000-0000-4001-8000-0000000000b3'
       AND game_id  = '00000000-0000-4001-8000-000000000031' $$,
  $$ VALUES (2::bigint) $$,
  'group B member can read own group past-game comments (visible ones only)'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.comments
     WHERE group_id = '00000000-0000-4001-8000-0000000000b3'
       AND deleted_at IS NOT NULL $$,
  $$ VALUES (0::bigint) $$,
  'soft-deleted comments are hidden from group members'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.reactions
     WHERE comment_id = '00000000-0000-4001-8000-0000000000c1' $$,
  $$ VALUES (1::bigint) $$,
  'group B member can read a reaction on a started-game comment'
);

-- Post-kickoff gate: future game comment is not visible even to own group member
SELECT results_eq(
  $$ SELECT count(*) FROM public.comments
     WHERE group_id = '00000000-0000-4001-8000-0000000000b3'
       AND game_id  = '00000000-0000-4001-8000-000000000032' $$,
  $$ VALUES (0::bigint) $$,
  'future-game comment not readable before kickoff even by own group member'
);

-- Transitive gate: a reaction on a pre-kickoff comment is hidden too.
SELECT results_eq(
  $$ SELECT count(*) FROM public.reactions
     WHERE comment_id = '00000000-0000-4001-8000-0000000000c2' $$,
  $$ VALUES (0::bigint) $$,
  'reaction on a pre-kickoff comment is not readable before kickoff'
);

-- ── Member can insert comment and reaction in own group ────────────────────────

SELECT lives_ok(
  $$ INSERT INTO public.comments (group_id, user_id, game_id, body)
     VALUES (
       '00000000-0000-4001-8000-0000000000b3',
       tests.get_supabase_uid('cr_player_b'),
       '00000000-0000-4001-8000-000000000031',
       'another comment by group B member'
     ) $$,
  'group B member can insert comment in own group'
);

SELECT lives_ok(
  $$ INSERT INTO public.reactions (group_id, user_id, comment_id, emoji)
     VALUES (
       '00000000-0000-4001-8000-0000000000b3',
       tests.get_supabase_uid('cr_player_b'),
       '00000000-0000-4001-8000-0000000000c1',
       '❤️'
     ) $$,
  'group B member can react on a comment in own group'
);

-- ── Cascade: deleting a comment removes its reactions ─────────────────────────

SELECT lives_ok(
  $$ DELETE FROM public.comments
     WHERE id = '00000000-0000-4001-8000-0000000000c3' $$,
  'group B member can delete own comment'
);

SELECT tests.clear_authentication();
RESET ROLE;

SELECT results_eq(
  $$ SELECT count(*) FROM public.reactions
     WHERE comment_id = '00000000-0000-4001-8000-0000000000c3' $$,
  $$ VALUES (0::bigint) $$,
  'deleting a comment cascades away its reactions'
);

-- ── Anon has no access ────────────────────────────────────────────────────────

SET ROLE anon;

SELECT throws_ok(
  $$ SELECT * FROM public.comments LIMIT 1 $$,
  '42501',
  NULL,
  'anon gets permission denied on comments'
);

SELECT throws_ok(
  $$ SELECT * FROM public.reactions LIMIT 1 $$,
  '42501',
  NULL,
  'anon gets permission denied on reactions'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
