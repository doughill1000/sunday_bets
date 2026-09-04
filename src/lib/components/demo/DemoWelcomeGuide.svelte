<script lang="ts">
  // The public demo's how-to-play popup (ADR-0026, builds on #864). A stranger landing on /demo
  // sees the payoff — a frozen board of picks, weights, All-In — but never the rules. This opens
  // the same How to Play the authenticated WelcomeGuide shows, so the game is taught on arrival.
  //
  // Demo-only differences from the authed guide: no name field (there is no account), and it
  // opens on EVERY visit rather than once — the demo is a marketing surface for strangers, so it
  // re-teaches each time rather than remembering a dismissal. Renders the shared HowToPlay
  // component (the same one /demo/how-to-play does), so the rules can't drift and there is no
  // second surface to open into.
  import { onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { page } from '$app/state';

  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import HowToPlay from '$lib/components/howto/HowToPlay.svelte';
  import { shouldAutoOpenDemoGuide } from './demoGuide.js';

  const isDesktop = new MediaQuery('(min-width: 640px)');

  // SSR renders closed; the decision to auto-open runs client-side on mount (once per page load,
  // since the demo layout persists across tab navigations).
  let open = $state(false);

  onMount(() => {
    if (shouldAutoOpenDemoGuide(page.url.pathname)) open = true;
  });

  // Dismiss (button / X / tap-out / ESC): just closes for this load — no persistence, so the
  // next visit teaches again.
  function dismiss() {
    open = false;
  }

  function handleOpenChange(v: boolean) {
    if (!v) open = false;
  }
</script>

{#if isDesktop.current}
  <Dialog bind:open onOpenChange={handleOpenChange}>
    <DialogContent data-testid="demo-welcome-guide" class="flex max-h-[85vh] max-w-lg flex-col">
      <DialogHeader>
        <DialogTitle class="text-2xl">How to Play</DialogTitle>
      </DialogHeader>
      <div class="min-h-0 overflow-y-auto">
        <HowToPlay />
      </div>
      <div class="pt-2">
        <Button class="w-full" data-testid="demo-guide-dismiss" onclick={dismiss}>Got it</Button>
      </div>
    </DialogContent>
  </Dialog>
{:else}
  <Sheet bind:open onOpenChange={handleOpenChange}>
    <SheetContent
      data-testid="demo-welcome-guide"
      side="bottom"
      class="max-h-[90vh] rounded-t-xl pb-8"
    >
      <SheetHeader class="pb-2">
        <SheetTitle class="text-2xl">How to Play</SheetTitle>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-4">
        <HowToPlay />
      </div>
      <div class="px-4 pt-2">
        <Button class="w-full" data-testid="demo-guide-dismiss" onclick={dismiss}>Got it</Button>
      </div>
    </SheetContent>
  </Sheet>
{/if}
