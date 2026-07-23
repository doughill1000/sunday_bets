<script lang="ts">
  // Demo Week (#776): mirrors the real /week destination on the frozen snapshot — the page leads
  // with the week's hardware and its legend (#631/#771), exactly as the demo League's old Week
  // tab rendered it. The demo has no week picker or per-user pick breakdown: the snapshot is one
  // concluded season viewed as one persona, so the page simply shows the most recent graded
  // week's hardware (newest-first per `getSeasonWeeklyAwards`).
  import type { PageData } from './$types';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import AwardsGuide from '$lib/components/AwardsGuide.svelte';
  import { weekLabel } from '$lib/utils/weekLabel';

  let { data }: { data: PageData } = $props();

  const latestHardware = $derived(data.weeklyAwards.weeks[0] ?? null);
  const subtitle = $derived(
    latestHardware
      ? `${data.completedSeasonYear} season · ${weekLabel({
          weekNumber: latestHardware.week_number,
          weekId: 0,
          isScoring: true
        })}.`
      : `${data.completedSeasonYear} season.`
  );
</script>

<svelte:head>
  <title>Week | Hotshot Demo</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-week-heading">
  <div>
    <h1 id="demo-week-heading" class="text-3xl font-bold tracking-tight">Week</h1>
    <p class="mt-1 text-muted-foreground">{subtitle}</p>
  </div>

  {#if latestHardware}
    <div data-testid="demo-week-hardware">
      <!-- Mirrors the real Week tab (#780): the weekly-hardware legend rides in the card header. -->
      <WeeklyHardware
        hardware={latestHardware}
        currentUserId={data.persona.userId}
        recapHref="/demo/recap#week-{latestHardware.week_number}"
        recapLabel="Read the recap"
      >
        {#snippet legend()}
          <AwardsGuide scope="weekly" />
        {/snippet}
      </WeeklyHardware>
    </div>
  {:else}
    <p class="text-sm text-muted-foreground">No graded weeks yet.</p>
  {/if}
</section>
