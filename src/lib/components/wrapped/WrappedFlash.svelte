<script lang="ts">
  // Once-per-season flash modal showing the Season Wrapped.
  // Tracks seen state in localStorage keyed by (group_id, season_year).
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import WrappedStory from './WrappedStory.svelte';
  import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';
  import X from '@lucide/svelte/icons/x';

  let { row }: { row: SeasonWrappedRow | null } = $props();

  let visible = $state(false);

  function seenKey(r: SeasonWrappedRow) {
    return `wrapped_seen_${r.group_id}_${r.season_year}`;
  }

  onMount(() => {
    if (!browser || !row) return;
    const key = seenKey(row);
    if (!localStorage.getItem(key)) {
      visible = true;
    }
  });

  function dismiss() {
    if (!row) return;
    if (browser) localStorage.setItem(seenKey(row), '1');
    visible = false;
  }
</script>

{#if visible && row}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    data-testid="wrapped-flash"
    onclick={(e) => {
      if (e.target === e.currentTarget) dismiss();
    }}
  >
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl">
      <div class="relative p-4">
        <button
          class="absolute -top-0 right-0 z-10 rounded-full bg-background border border-border p-1.5 shadow-md hover:bg-muted transition-colors"
          onclick={dismiss}
          aria-label="Dismiss Season Wrapped"
          data-testid="wrapped-dismiss"
        >
          <X class="h-4 w-4 text-muted-foreground" />
        </button>
        <WrappedStory {row} />
      </div>
    </div>
  </div>
{/if}
