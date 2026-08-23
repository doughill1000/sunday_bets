- **PR #847** Raise contrast on avatar presets and the champion badge — several
  avatar-picker emoji sat on a background in the same color family as the glyph
  itself (gold trophy on orange, yellow lightning on amber, green clover on green,
  red flame on red), and the reigning-champion Crown badge was a bare icon painted
  directly over the avatar, nearly invisible on gold-family presets. Recolored the
  affected presets, gave the Crown badge its own background chip, and added a
  subtle definition ring to every avatar. files: `src/lib/avatars.ts` ·
  `src/lib/components/UserAvatar.svelte` · `src/routes/(app)/settings/+page.svelte`
