<!-- src/lib/components/leaderboard/weekly/LeaderboardWeekly.svelte -->
<script lang="ts">
  import { Accordion } from '$lib/components/ui/accordion';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import WeekItem from './WeekItem.svelte';
  import {
    players,
    weeks,
    activeWeekNumber,
    weekTotals,
    tableByWeek,
    orderedPlayers
  } from '$lib/stores/leaderboard';

  let hidden: Set<string> = new Set();

  function togglePlayer(id: string) {
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    hidden = new Set(hidden);
  }

  // derive visible ordered players
  $: visiblePlayersRaw = $orderedPlayers.filter((p) => !hidden.has(p.id));
  // grid templates
  $: mobileGridTemplate = `160px repeat(${visiblePlayersRaw.length}, 120px)`;
  $: desktopGridTemplate = `240px repeat(${visiblePlayersRaw.length}, minmax(180px, 1fr))`;
</script>

<Card class="mx-auto w-full shadow-sm">
  <CardHeader>
    <CardTitle class="text-xl">Weekly Progress — Season {$activeWeekNumber ? '' : ''}</CardTitle>
  </CardHeader>

  <CardContent class="space-y-2">
    <div class="flex flex-wrap gap-2 pb-2">
      {#each $players as p}
        <button
          class="rounded border px-2 py-1 text-xs"
          on:click={() => togglePlayer(p.id)}
          class:opacity-50={hidden.has(p.id)}
        >
          {p.display_name}
        </button>
      {/each}
    </div>

    <Accordion type="multiple" class="w-full">
      {#each $weeks as wk (wk)}
        <WeekItem
          weekNumber={wk}
          players={visiblePlayersRaw}
          weekTotals={$weekTotals[wk] ?? {}}
          games={$tableByWeek[wk]?.games ?? []}
          cells={$tableByWeek[wk]?.cells ?? {}}
          gridTemplate={mobileGridTemplate}
          gridTemplateLg={desktopGridTemplate}
          activeWeekNumber={$activeWeekNumber}
        />
      {/each}
    </Accordion>
  </CardContent>
</Card>
