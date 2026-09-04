<script lang="ts">
  // First-teach for the public demo (ADR-0026, builds on #864). A stranger landing on /demo
  // sees the payoff — a frozen board of picks, weights, All-In — but never the rules. The
  // authenticated app already opens WelcomeGuide once for new accounts; the demo visitor is
  // strictly more of a stranger yet got nothing, so this mirrors that pattern, keyed to a
  // per-browser localStorage flag since there is no account here.
  //
  // Deliberately a SHORT primer, not the full rules: four beats plus a link to the canonical
  // /demo/how-to-play (the same HowToPlay the authed page renders), so the overlay never walls
  // the visitor who came to look and the rules can't drift. Its one resolving action is a quiet
  // dismiss — the demo keeps exactly one gold CTA (Start your league, in the nav), DESIGN P6.
  import { onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import { DEMO_GUIDE_SEEN_KEY, shouldAutoOpenDemoGuide } from './demoGuide.js';

  let { personaName }: { personaName: string } = $props();

  const isDesktop = new MediaQuery('(min-width: 640px)');

  // SSR renders closed; the localStorage read (and so the decision to auto-open) is client-only.
  let open = $state(false);

  onMount(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(DEMO_GUIDE_SEEN_KEY);
    } catch {
      seen = null; // private mode / blocked storage — treat as first visit, harmless.
    }
    if (shouldAutoOpenDemoGuide({ seen, pathname: page.url.pathname })) open = true;
  });

  function markSeen() {
    if (!browser) return;
    try {
      localStorage.setItem(DEMO_GUIDE_SEEN_KEY, new Date().toISOString());
    } catch {
      // Best-effort: if storage is blocked the primer simply shows again next visit.
    }
  }

  // Dismiss (button / grabber / tap-out / ESC): remember it and never re-open unasked.
  function dismiss() {
    open = false;
    markSeen();
  }

  function handleOpenChange(v: boolean) {
    if (!v) dismiss();
  }

  // "Read the full rules" also counts as first-teach done, so returning to /demo won't re-open.
  function toFullRules() {
    open = false;
    markSeen();
    void goto('/demo/how-to-play');
  }

  const beats = [
    {
      t: 'Pick against the spread',
      d: "The spread is the favorite's cushion — you pick who beats the number, not who wins."
    },
    { t: 'Weight your conviction', d: 'Every pick is worth Low 1, Medium 3, or High 5 points.' },
    {
      t: 'One All-In a week',
      d: 'Mark a single pick All-In for ±10 — save it for the game you trust most.'
    },
    {
      t: 'Scoring is symmetric',
      d: 'A right pick adds its weight; a wrong one subtracts the same. A push is zero.'
    }
  ];
</script>

{#snippet primer()}
  <p class="text-sm text-muted-foreground">
    You're watching {personaName}'s season, read-only. Here's the game in four beats.
  </p>
  <ol class="mt-4 space-y-3" data-testid="demo-guide-primer">
    {#each beats as beat, i (beat.t)}
      <li class="flex gap-3">
        <span
          class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 font-mono text-xs font-bold text-primary-ink"
          aria-hidden="true"
        >
          {i + 1}
        </span>
        <span class="text-sm">
          <span class="font-semibold text-foreground">{beat.t}.</span>
          <span class="text-muted-foreground">{beat.d}</span>
        </span>
      </li>
    {/each}
  </ol>
  <button
    type="button"
    onclick={toFullRules}
    data-testid="demo-guide-full-rules"
    class="group mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
  >
    <span
      class="underline decoration-primary-ink/50 underline-offset-4 group-hover:decoration-primary-ink"
    >
      Read the full rules
    </span>
    <ArrowRight class="size-4" aria-hidden="true" />
  </button>
{/snippet}

{#if isDesktop.current}
  <Dialog bind:open onOpenChange={handleOpenChange}>
    <DialogContent data-testid="demo-welcome-guide" class="flex max-h-[85vh] max-w-md flex-col">
      <DialogHeader>
        <DialogTitle class="text-2xl">How to Play</DialogTitle>
      </DialogHeader>
      <div class="min-h-0 overflow-y-auto">
        {@render primer()}
      </div>
      <div class="pt-2">
        <Button
          variant="secondary"
          class="w-full"
          data-testid="demo-guide-dismiss"
          onclick={dismiss}
        >
          Got it — explore the demo
        </Button>
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
        {@render primer()}
      </div>
      <div class="px-4 pt-2">
        <Button
          variant="secondary"
          class="w-full"
          data-testid="demo-guide-dismiss"
          onclick={dismiss}
        >
          Got it — explore the demo
        </Button>
      </div>
    </SheetContent>
  </Sheet>
{/if}
