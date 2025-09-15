<script lang="ts">
  import { onMount } from 'svelte';
  import { picks, setPicks, selectTeam } from '$lib/stores/picks';
  import type { UIGame } from '$lib/types/ui';
  import type { PickEntry } from '$lib/types/server';
  import GameCard from './GameCard.svelte';

  export let games: UIGame[] = [];
  export let initialPicks: Record<string, PickEntry> = {};

  let initialized = false;

  onMount(() => {
    if (!initialized && initialPicks) {
      setPicks(initialPicks);
      for (const g of games) {
        const entry = $picks[g.id];
        const hasSelection = entry?.selected || entry?.lockedPick;
        if (!hasSelection) selectTeam(g.id, 'home');
      }
      initialized = true;
    }
  });
</script>

<h1 class="mb-4 text-2xl font-semibold">My Picks</h1>

{#if games.length === 0}
  <p class="opacity-70">No scheduled games for the active week.</p>
{:else}
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each games as g (g.id)}
      <GameCard game={g} {initialized} />
    {/each}
  </div>
{/if}
