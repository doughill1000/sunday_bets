- **#666** Fixed stray "Group" copy still shown to users instead of "League" — the join
  flow, league manage screen, HowToPlay guide, and admin surfaces now consistently say
  "League" to match the renamed routes and nav (see the League vs Market naming
  decision). Copy/aria-label only, no route or identifier renames. files:
  `GroupSwitcher.svelte` · `routes/join/**` · `routes/(app)/league/manage/+page.svelte` ·
  `HowToPlay.svelte` · `AddMemberCard.svelte` · `routes/(app)/admin/feedback/+page.svelte`
