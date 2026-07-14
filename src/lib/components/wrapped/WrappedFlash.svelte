<script lang="ts">
  // Once-per-season flash modal showing the Season Wrapped, rebuilt on the vendored
  // Dialog (desktop) / bottom Sheet (mobile) split — matches AwardsGuide/WelcomeGuide
  // (audit S8, issue #548). Seen state is a server-side marker (wrapped_seen) keyed by
  // (user, group, season), mirroring RecapFlash's recap_seen (#302), so it's
  // consistent across a player's devices rather than per-device.
  import { onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
  import WrappedStory from './WrappedStory.svelte';
  import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';

  let { row, alreadySeen }: { row: SeasonWrappedRow | null; alreadySeen: boolean } = $props();

  const isDesktop = new MediaQuery('(min-width: 640px)');
  let open = $state(false);

  onMount(() => {
    open = !!row && !alreadySeen;
  });

  async function dismiss() {
    open = false;
    if (!row) return;
    try {
      await fetch('/api/wrapped/mark-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonYear: row.season_year })
      });
    } catch {
      // Best-effort: worst case the flash reappears next load, no worse than before.
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) void dismiss();
  }
</script>

{#if row}
  {#if isDesktop.current}
    <Dialog bind:open onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="wrapped-flash"
        class="flex max-h-[85vh] max-w-lg flex-col overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Your {row.season_year} Season Wrapped is ready</DialogTitle>
        </DialogHeader>
        <WrappedStory {row} />
      </DialogContent>
    </Dialog>
  {:else}
    <Sheet bind:open onOpenChange={handleOpenChange}>
      <SheetContent
        data-testid="wrapped-flash"
        side="bottom"
        class="max-h-[90vh] overflow-y-auto rounded-t-xl pb-8"
      >
        <SheetHeader class="pb-2">
          <SheetTitle>Your {row.season_year} Season Wrapped is ready</SheetTitle>
        </SheetHeader>
        <div class="px-4">
          <WrappedStory {row} />
        </div>
      </SheetContent>
    </Sheet>
  {/if}
{/if}
