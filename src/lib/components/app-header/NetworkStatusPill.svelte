<script lang="ts">
  // Shell-level offline/stale indicator (audit S5, ADR-0017). The client cache exists to keep
  // the last-good screen on a background-refetch failure, so a surface no longer swaps its
  // populated view for an error card — but that silent staleness has to be *surfaced*. This one
  // pill lives in the app shell, so every cached read screen (stats / league / leaderboard)
  // inherits it instead of hand-rolling its own indicator.
  //
  // Two independent signals drive it, both read straight from TanStack:
  //  • offline — `onlineManager` flips false; every query is paused (fetchStatus 'paused'), so
  //    what's on screen is the last-good snapshot from cache/IndexedDB.
  //  • staleError — an *active* (mounted) query errored on a background refetch, but TanStack v5
  //    kept its previous `data`; the surface still renders, just with a stale value and a past
  //    `dataUpdatedAt`.
  import { useQueryClient, onlineManager } from '@tanstack/svelte-query';
  import WifiOff from '@lucide/svelte/icons/wifi-off';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';

  const client = useQueryClient();

  let online = $state(onlineManager.isOnline());
  let staleError = $state(false);

  function recomputeStale() {
    // Only *active* queries count — a stale error on a screen the user has since navigated away
    // from must not keep the pill up. `data !== undefined` is the "we still have last-good data"
    // test: a genuine no-data failure renders the surface's own error card instead.
    staleError =
      client.getQueryCache().findAll({
        type: 'active',
        predicate: (q) => q.state.status === 'error' && q.state.data !== undefined
      }).length > 0;
  }

  $effect(() => {
    recomputeStale();
    const unsubscribeCache = client.getQueryCache().subscribe(recomputeStale);
    const unsubscribeOnline = onlineManager.subscribe((isOnline) => {
      online = isOnline;
    });
    return () => {
      unsubscribeCache();
      unsubscribeOnline();
    };
  });

  const visible = $derived(!online || staleError);

  let retrying = $state(false);
  async function retry() {
    // Only reachable while online (see the template), so the refetch resolves rather than
    // pausing — refetch every active query so the errored one recovers and the pill clears.
    retrying = true;
    try {
      await client.refetchQueries({ type: 'active' });
    } finally {
      retrying = false;
    }
  }
</script>

{#if visible}
  <!-- Bottom-centred above the mobile tab bar (`bottom-20`), dropping to the bottom edge from `sm`
       up. The wrapper is click-through (`pointer-events-none`) so it never blocks the content
       behind it; only the pill itself is interactive. -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-4"
    data-testid="network-status-pill"
  >
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-auto flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-foreground shadow-elevation-popover"
    >
      {#if !online}
        <WifiOff class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>You're offline — showing saved data.</span>
      {:else}
        <RefreshCw class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>Couldn't refresh — showing saved data.</span>
        <button
          type="button"
          data-testid="network-status-retry"
          class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-medium text-primary-ink hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
          onclick={retry}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      {/if}
    </div>
  </div>
{/if}
