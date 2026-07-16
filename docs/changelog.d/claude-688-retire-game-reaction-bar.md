- **#688** Retire the game-level emoji reaction bar — removes the standalone 👍👎🔥😬🎯
  reaction row above the comment thread on kicked-off games, clearing the way for the
  comment-reactions sibling to make commenting the place people react. UI-only removal;
  the `reactions` table/API retire alongside that sibling's migration. files:
  `src/lib/components/picks/CommentsSection.svelte` ·
  `src/lib/components/picks/LockedPicksSection.svelte` ·
  `src/routes/(app)/picks/+page.server.ts`
