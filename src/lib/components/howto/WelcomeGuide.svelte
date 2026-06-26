<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';

  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import HowToPlay from './HowToPlay.svelte';
  import { shouldAutoOpenGuide } from './guide.js';

  interface Props {
    guideSeenAt: string | null;
    user: User | null;
  }

  let { guideSeenAt, user }: Props = $props();

  const isDesktop = new MediaQuery('(min-width: 640px)');

  let open = $state(shouldAutoOpenGuide({ guideSeenAt, pathname: page.url.pathname }));

  async function dismiss() {
    if (!open) return;
    open = false;
    if (!user) return;
    await fetch('/api/profile/guide-seen', { method: 'POST' });
    await invalidateAll();
  }

  function handleOpenChange(v: boolean) {
    if (!v) dismiss();
  }
</script>

{#if isDesktop.current}
  <Dialog bind:open onOpenChange={handleOpenChange}>
    <DialogContent data-testid="welcome-guide" class="max-h-[85vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-2xl">How to Play</DialogTitle>
      </DialogHeader>
      <HowToPlay />
      <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="sm" onclick={dismiss}>Skip for now</Button>
        <Button data-testid="guide-dismiss" onclick={dismiss}>Got it</Button>
      </div>
    </DialogContent>
  </Dialog>
{:else}
  <Sheet bind:open onOpenChange={handleOpenChange}>
    <SheetContent
      data-testid="welcome-guide"
      side="bottom"
      class="max-h-[90vh] overflow-y-auto rounded-t-xl pb-8"
    >
      <SheetHeader class="pb-4">
        <SheetTitle class="text-2xl">How to Play</SheetTitle>
      </SheetHeader>
      <HowToPlay />
      <div class="flex flex-col gap-2 pt-4">
        <Button data-testid="guide-dismiss" onclick={dismiss}>Got it</Button>
        <Button variant="ghost" onclick={dismiss}>Skip for now</Button>
      </div>
    </SheetContent>
  </Sheet>
{/if}
