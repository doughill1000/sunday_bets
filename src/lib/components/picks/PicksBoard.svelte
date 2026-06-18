<script lang="ts">
  import { onMount } from 'svelte';
  import { picks, setPicks, selectTeam } from '$lib/stores/picks';
  import type { UIGame } from '$lib/types/ui';
  import type { PickEntry } from '$lib/types/server';
  import type { Database } from '$lib/types/supabase';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
  import GameCard from './GameCard.svelte';

  type Week = Database['public']['Tables']['weeks']['Row'];

  interface Props {
    week?: Week | null;
    games?: UIGame[];
    initialPicks?: Record<string, PickEntry>;
  }
  let { week = null, games = [], initialPicks = {} }: Props = $props();

  let initialized = $state(false);

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
  <Alert>
    {#if !week}
      <AlertTitle>It's the offseason</AlertTitle>
      <AlertDescription>No active pick week right now. Check back when the season kicks off.</AlertDescription>
    {:else}
      <AlertTitle>No games scheduled yet</AlertTitle>
      <AlertDescription>Games for this week haven't been loaded yet — check back soon.</AlertDescription>
    {/if}
  </Alert>
{:else}
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each games as g (g.id)}
      <GameCard game={g} {initialized} />
    {/each}
  </div>
{/if}
