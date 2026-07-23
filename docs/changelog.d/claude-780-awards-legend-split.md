- **#780** Split the single Awards legend (#771) into two scoped legends — `AwardsGuide`
  gains a `scope` prop so each surface mounts only the tier it shows: season titles on the
  `/league` Honors tab and Season Wrapped ("Awards legend"), weekly hardware on the new
  `/week` tab (#776) and the `/recap` archive ("Hardware legend"). A legend no longer opens
  on a tier that isn't on the screen beside it. Also moves the `/week` legend trigger off its
  stray spot below the hardware card into the `WeeklyHardware` card header. Demo mirrors
  follow. files: `AwardsGuide.svelte`, `WeeklyHardware.svelte`, `(app)/week`, `demo/week`,
  `(app)/recap`, `demo/recap`, `LeagueHonors.svelte`, `WrappedStory.svelte` · ADR-0030, ADR-0035
