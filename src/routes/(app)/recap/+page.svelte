<script lang="ts">
  import type { PageData } from './$types';
  import RecapCard from '$lib/components/recap/RecapCard.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-2xl space-y-4 px-4 py-6">
  <div class="flex items-center gap-2">
    <Sparkles class="h-5 w-5 text-primary" />
    <h1 class="text-xl font-semibold">League Recaps</h1>
  </div>

  {#if data.recaps.length === 0}
    <p class="text-sm text-muted-foreground">
      No recaps yet — the AI commentator fires after each week grades.
    </p>
  {:else}
    <div class="space-y-3">
      {#each data.recaps as recap (recap.id)}
        <RecapCard {recap} />
      {/each}
    </div>
  {/if}
</div>
