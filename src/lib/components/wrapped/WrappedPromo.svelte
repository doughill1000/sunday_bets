<script lang="ts">
  // Seasonal CTA that surfaces Season Wrapped without spending a permanent nav tab on a
  // page that is empty most of the year. It appears once a season has a generated Wrapped
  // (passed as `seasonYear`) and routes to /wrapped for that season. Dismissal is tracked
  // in localStorage keyed by (group_id, season_year) — matching WrappedFlash — so it recedes
  // once acknowledged and returns when the next season finalises.
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import Gift from '@lucide/svelte/icons/gift';
  import X from '@lucide/svelte/icons/x';

  let { groupId, seasonYear }: { groupId: string; seasonYear: number } = $props();

  let visible = $state(false);

  const dismissKey = $derived(`wrapped_promo_dismissed_${groupId}_${seasonYear}`);

  onMount(() => {
    if (!browser) return;
    if (!localStorage.getItem(dismissKey)) visible = true;
  });

  function dismiss() {
    if (browser) localStorage.setItem(dismissKey, '1');
    visible = false;
  }
</script>

{#if visible}
  <div
    data-testid="wrapped-promo"
    class="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 pr-12 sm:p-5 sm:pr-14"
  >
    <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
      <Gift class="size-5 text-primary" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="font-semibold tracking-tight">Your {seasonYear} Season Wrapped is ready</p>
      <p class="text-sm text-muted-foreground">
        Your year in picks — rank, record, badges, and a recap of the season.
      </p>
    </div>
    <Button href="/wrapped?season={seasonYear}" data-testid="wrapped-promo-cta" class="shrink-0">
      View Wrapped
    </Button>
    <button
      type="button"
      onclick={dismiss}
      aria-label="Dismiss Season Wrapped promo"
      data-testid="wrapped-promo-dismiss"
      class="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <X class="size-4" />
    </button>
  </div>
{/if}
