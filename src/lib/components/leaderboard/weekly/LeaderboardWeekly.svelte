<!-- src/lib/components/leaderboard/weekly/LeaderboardWeekly.svelte -->
<script lang="ts">
  import { Accordion } from '$lib/components/ui/accordion';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import WeekItem from './WeekItem.svelte';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import {
    players,
    weeks,
    activeWeekNumber,
    weekTotals,
    tableByWeek,
    orderedPlayers
  } from '$lib/stores/leaderboard';

  import { SvelteSet } from 'svelte/reactivity';

  const hidden = new SvelteSet<string>();

  function togglePlayer(id: string) {
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
  }

  // derive visible ordered players
  const visiblePlayersRaw = $derived($orderedPlayers.filter((p) => !hidden.has(p.id)));
  const mobileGridTemplate = $derived(`100px repeat(${visiblePlayersRaw.length}, 80px)`);
  const desktopGridTemplate = $derived(
    `240px repeat(${visiblePlayersRaw.length}, minmax(180px, 1fr))`
  );
</script>

<Card class="mx-auto w-full shadow-sm">
  <CardHeader>
    <CardTitle class="text-xl">Weekly Progress — Season {$activeWeekNumber ? '' : ''}</CardTitle>
  </CardHeader>

  <CardContent class="space-y-2">
    <div class="flex flex-wrap gap-2 pb-2">
      {#each $players as p (p.id)}
        <button
          class="flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
          onclick={() => togglePlayer(p.id)}
          class:opacity-50={hidden.has(p.id)}
        >
          <UserAvatar avatarKey={p.avatar_key ?? null} displayName={p.display_name} size="xs" />
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
