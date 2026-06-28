<script lang="ts">
  // Once-per-week flash modal showing the latest AI recap.
  // Tracks seen state in localStorage keyed by (group_id, season_year, week_number).
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import RecapCard from './RecapCard.svelte';
  import type { RecapRow } from '$lib/server/db/queries/recaps';
  import X from '@lucide/svelte/icons/x';

  let { recap }: { recap: RecapRow | null } = $props();

  let visible = $state(false);

  function seenKey(r: RecapRow) {
    return `recap_seen_${r.group_id}_${r.season_year}_${r.week_number}`;
  }

  onMount(() => {
    if (!browser || !recap) return;
    const key = seenKey(recap);
    if (!localStorage.getItem(key)) {
      visible = true;
    }
  });

  function dismiss() {
    if (!recap) return;
    if (browser) localStorage.setItem(seenKey(recap), '1');
    visible = false;
  }
</script>

{#if visible && recap}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    onclick={(e) => {
      if (e.target === e.currentTarget) dismiss();
    }}
  >
    <div class="w-full max-w-md">
      <div class="relative">
        <button
          class="absolute -top-3 -right-3 z-10 rounded-full bg-background border border-border p-1.5 shadow-md hover:bg-muted transition-colors"
          onclick={dismiss}
          aria-label="Dismiss recap"
          data-testid="recap-dismiss"
        >
          <X class="h-4 w-4 text-muted-foreground" />
        </button>
        <RecapCard {recap} />
      </div>
    </div>
  </div>
{/if}
