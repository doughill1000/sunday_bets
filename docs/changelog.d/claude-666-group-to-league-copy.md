- **#666** Fixed stray "Group" copy still shown to users instead of "League" — the join
  flow, league manage screen, and admin surfaces now consistently say "League" to match
  the renamed routes and nav (see the League vs Market naming decision). Copy/aria-label
  only, no route or identifier renames. (`HowToPlay.svelte`'s terminology fix landed
  separately via #671/#633.) files: `GroupSwitcher.svelte` · `routes/join/**` ·
  `routes/(app)/league/manage/+page.svelte` · `AddMemberCard.svelte` ·
  `routes/(app)/admin/feedback/+page.svelte`
