<script lang="ts">
  import type { PageData } from './$types';
  import RecapCard from '$lib/components/recap/RecapCard.svelte';
  import DemoSignupCta from '$lib/components/demo/DemoSignupCta.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-2xl space-y-4">
  <div class="flex items-center gap-2">
    <Sparkles class="h-5 w-5 text-primary" />
    <h1 class="text-xl font-semibold">League Recaps</h1>
  </div>
  <p class="text-sm text-muted-foreground">
    After every week grades, the Commissioner — your league's AI trash-talker — writes the recap.
  </p>

  {#if data.recaps.length === 0}
    <p class="text-sm text-muted-foreground">No recaps in this snapshot.</p>
  {:else}
    <div class="space-y-3">
      {#each data.recaps as recap (recap.id)}
        <RecapCard {recap} />
      {/each}
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-sm">
    <span class="flex-1 text-muted-foreground">Get recaps like these for your own league.</span>
    <DemoSignupCta label="Sign up free" />
  </div>
</div>
