<script lang="ts">
  // Once-per-week flash modal showing the latest AI recap. Seen state is a
  // server-side marker (recap_seen, #302) keyed by (user, group, season, week),
  // so it's consistent across a player's devices rather than per-device.
  import { onMount } from 'svelte';
  import RecapCard from './RecapCard.svelte';
  import type { RecapRow } from '$lib/server/db/queries/recaps';
  import X from '@lucide/svelte/icons/x';

  let { recap, alreadySeen }: { recap: RecapRow | null; alreadySeen: boolean } = $props();

  let visible = $state(false);

  onMount(() => {
    visible = !!recap && !alreadySeen;
  });

  async function dismiss() {
    visible = false;
    if (!recap) return;
    try {
      await fetch('/api/recap/mark-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonYear: recap.season_year,
          weekNumber: recap.week_number
        })
      });
    } catch {
      // Best-effort: worst case the flash reappears next load, no worse than before.
    }
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
