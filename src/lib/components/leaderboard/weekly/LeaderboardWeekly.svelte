<!-- src/lib/components/leaderboard/weekly/LeaderboardWeekly.svelte -->
<script lang="ts">
  import { Accordion } from '$lib/components/ui/accordion';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import WeekItem from './WeekItem.svelte';

  // Domain/server types (adjust path to where you exported these)
  import type { PlayerRow, WeekTable } from '$lib/types/server/leaderboard';

  // Props from load
  export let seasonYear: number;
  export let players: PlayerRow[] = [];
  export let weeks: number[] = [];
  export let tableByWeek: Record<number, WeekTable> = {};
  export let weekTotals: Record<number, Record<string, number>> = {};
  export let currentUserId: string | null = null;
  export let activeWeekNumber: number | null = null;

  // Local state (no external store)
  let hidden: Set<string> = new Set();
  // If you ever want to support reordering, keep an order array.
  // For now, follow incoming order from props:
  $: order = players.map((p) => p.id);

  // Derived view data
  $: visibleIds = order.filter((id) => !hidden.has(id));
  $: visiblePlayersRaw = visibleIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as PlayerRow[];
  // move current user to front
  $: visiblePlayers = currentUserId
    ? [...visiblePlayersRaw].sort((a, b) =>
        a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : 0
      )
    : visiblePlayersRaw;

  // Grid template: left "Game" column + one column per visible player
  $: mobileGridTemplate = `160px repeat(${visiblePlayers.length}, 120px)`;
  $: desktopGridTemplate = `240px repeat(${visiblePlayers.length}, minmax(180px, 1fr))`;

  function togglePlayer(id: string) {
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    // trigger reactivity
    hidden = new Set(hidden);
  }
</script>

<Card class="mx-auto w-full shadow-sm">
  <CardHeader>
    <CardTitle class="text-xl">Weekly Progress — Season {seasonYear}</CardTitle>
  </CardHeader>

  <CardContent class="space-y-2">
    <!-- Optional: quick per-player show/hide toggles -->
    <div class="flex flex-wrap gap-2 pb-2">
      {#each players as p}
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
      {#each weeks as wk (wk)}
        <WeekItem
          weekNumber={wk}
          players={visiblePlayers}
          weekTotals={weekTotals[wk] ?? {}}
          games={tableByWeek[wk]?.games ?? []}
          cells={tableByWeek[wk]?.cells ?? {}}
          gridTemplate={mobileGridTemplate}
          gridTemplateLg={desktopGridTemplate}
          activeWeekNumber={activeWeekNumber}
        />
      {/each}
    </Accordion>
  </CardContent>
</Card>
