- **PR #662** Invites card cleanup — the invite row now stacks on mobile instead of the
  code overlapping the action buttons, Share is the primary action (Copy demoted to
  secondary), and `mint_invite` reuses an existing unlimited/no-expiry invite instead of
  minting a new row every click, so the Active invites list no longer piles up with
  duplicates. files: `league/manage/+page.svelte` · `mint_invite.sql`
