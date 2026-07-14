<script lang="ts">
  // Once-per-week flash modal showing the latest AI recap, rebuilt on the vendored
  // Dialog (desktop) / bottom Sheet (mobile) split — matches AwardsGuide/WelcomeGuide
  // (audit S8, issue #548). Seen state is a server-side marker (recap_seen, #302)
  // keyed by (user, group, season, week), so it's consistent across a player's
  // devices rather than per-device.
  import { onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
  import RecapCard from './RecapCard.svelte';
  import type { RecapRow } from '$lib/server/db/queries/recaps';

  let { recap, alreadySeen }: { recap: RecapRow | null; alreadySeen: boolean } = $props();

  const isDesktop = new MediaQuery('(min-width: 640px)');
  let open = $state(false);

  onMount(() => {
    open = !!recap && !alreadySeen;
  });

  async function dismiss() {
    open = false;
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

  function handleOpenChange(v: boolean) {
    if (!v) void dismiss();
  }
</script>

{#if recap}
  {#if isDesktop.current}
    <Dialog bind:open onOpenChange={handleOpenChange}>
      <DialogContent data-testid="recap-flash" class="max-w-md">
        <DialogHeader class="sr-only">
          <!-- RecapCard renders its own visible "Week N Recap" heading below, so the
               dialog's required accessible name is screen-reader-only to avoid a
               duplicate visible heading. -->
          <DialogTitle>This week's recap</DialogTitle>
        </DialogHeader>
        <RecapCard {recap} />
      </DialogContent>
    </Dialog>
  {:else}
    <Sheet bind:open onOpenChange={handleOpenChange}>
      <SheetContent
        data-testid="recap-flash"
        side="bottom"
        class="max-h-[85vh] overflow-y-auto rounded-t-xl pb-8"
      >
        <SheetHeader class="sr-only">
          <SheetTitle>This week's recap</SheetTitle>
        </SheetHeader>
        <div class="px-4">
          <RecapCard {recap} />
        </div>
      </SheetContent>
    </Sheet>
  {/if}
{/if}
