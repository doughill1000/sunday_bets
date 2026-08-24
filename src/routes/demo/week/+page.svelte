<script lang="ts">
  // Demo Week (#776, #833): mirrors the real /week destination on the frozen snapshot.
  //
  // Since #832 made kickoff the boundary, /week owns the live layer outright — so the demo's
  // mid-Sunday sweat showcase (#585) lives here, above the week's hardware and its legend
  // (#631/#771). The page renders the SAME `WeeklyLiveBoard` + `WeeklyPickCard` the authed /week
  // does, fed from the committed snapshot instead of a poll: `WeeklyPicksBreakdown` is
  // deliberately not reused, because its whole body is the live-scores query, and the public demo
  // must issue zero per-visitor ESPN calls (ADR-0026 §4).
  //
  // The demo has no week picker: the snapshot is one concluded season plus one frozen live week,
  // viewed as one persona, so the sweat is that week and the hardware is the most recent graded
  // one (newest-first per `getSeasonWeeklyAwards`).
  import type { PageData } from './$types';
  import WeeklyLiveBoard from '$lib/components/leaderboard/WeeklyLiveBoard.svelte';
  import WeeklyPickCard from '$lib/components/leaderboard/WeeklyPickCard.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import AwardsGuide from '$lib/components/AwardsGuide.svelte';
  import { weekLabel } from '$lib/utils/weekLabel';

  let { data }: { data: PageData } = $props();

  const latestHardware = $derived(data.weeklyAwards.weeks[0] ?? null);
  const hardwareLabel = $derived(
    latestHardware
      ? weekLabel({ weekNumber: latestHardware.week_number, weekId: 0, isScoring: true })
      : null
  );

  // The page now carries the snapshot's two vantage points at once (ADR-0026 §2): the frozen
  // week in play up top, and a graded week's hardware from the completed season below. The
  // subtitle has to name both, or the season year reads as a caption for the live board.
  const subtitle = $derived(
    data.breakdown.length > 0 && hardwareLabel
      ? `A Sunday in progress — and ${hardwareLabel}'s hardware from the ${data.completedSeasonYear} season.`
      : hardwareLabel
        ? `${data.completedSeasonYear} season · ${hardwareLabel}.`
        : `${data.completedSeasonYear} season.`
  );

  // Same gate the real breakdown uses: show the ranked board once at least one pick has a result.
  const showBoard = $derived(data.standings.some((s) => s.decided > 0));
</script>

<svelte:head>
  <title>Week | Hotshot Demo</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-week-heading">
  <div>
    <h1 id="demo-week-heading" class="text-3xl font-bold tracking-tight">Week</h1>
    <p class="mt-1 text-muted-foreground">{subtitle}</p>
  </div>

  <!-- The sweat leads the page: a Sunday afternoon in progress is the demo's most persuasive
       screen, and it is what a visitor arriving from the picks board's handoff strip came to see.
       The settled hardware below is the payoff it builds to. -->
  {#if data.breakdown.length > 0}
    <div class="space-y-4" data-testid="demo-weekly-breakdown">
      <h2 class="sr-only">Week {data.liveWeekNumber} in play</h2>
      {#if showBoard}
        <WeeklyLiveBoard standings={data.standings} live frozen />
      {/if}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.breakdown as game (game.gameId)}
          <WeeklyPickCard {game} liveScore={data.liveScores[game.gameId] ?? null} />
        {/each}
      </div>
    </div>
  {/if}

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
