-- Repoint reactions from games to comments (#689). #688 retired the game-level
-- reaction bar; reactions now attach to a specific comment (iMessage-style
-- tapbacks), making comments the social surface. The app is not in active use, so
-- this is a clean cutover — existing game-scoped reactions are truncated (no
-- backfill) rather than migrated. Base table: 0216_reactions.sql.

-- Clear game-scoped reactions before the column swap (no backfill). Truncating
-- first also lets us add comment_id NOT NULL without a default on an empty table.
truncate table public.reactions;

-- The reactions read policy references game_id, so it must be dropped before the
-- column can go. 41_policies_comments_reactions.sql recreates it against
-- comment_id in the policies phase of this same migration.
drop policy if exists sel_reactions_member_post_kickoff on public.reactions;

-- Drop the game_id target and its unique constraint / lookup index.
alter table public.reactions drop constraint if exists reactions_unique_user_game_emoji;
drop index if exists public.idx_reactions_group_game;
alter table public.reactions drop column if exists game_id;

-- Add the comment_id target: a reaction now hangs off a comment and cascades away
-- when that comment is hard-deleted.
alter table public.reactions
  add column if not exists comment_id uuid not null
    references public.comments(id) on delete cascade;

-- One reaction per emoji per user per comment per group (replaces the per-game key).
alter table public.reactions drop constraint if exists reactions_unique_user_comment_emoji;
alter table public.reactions
  add constraint reactions_unique_user_comment_emoji
    unique (group_id, user_id, comment_id, emoji);

create index if not exists idx_reactions_group_comment
  on public.reactions (group_id, comment_id);
