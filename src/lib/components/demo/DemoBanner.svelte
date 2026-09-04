<script lang="ts">
  // Persistent "you're inhabiting a persona, this is a demo" banner (#460, ADR-0026). Explains
  // the "you" lens (personalized surfaces render from this player's frozen payload). Conversion
  // lives in the single sticky nav CTA, not here — the demo keeps exactly one sign-up button.
  //
  // It carries a persistent re-entry door to the rules (#864): first-teach now auto-opens once
  // (DemoWelcomeGuide), so this is the quiet way back for anyone who dismissed it. Lands here,
  // not as a sixth nav tab (How to Play is not a tab in the real app either), and stays a quiet
  // text link subordinate to the nav's sign-up CTA.
  import Eye from '@lucide/svelte/icons/eye';
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import { page } from '$app/state';

  let { personaName }: { personaName: string } = $props();

  // No self-link once you're already reading the rules.
  const onHowToPlay = $derived(page.url.pathname === '/demo/how-to-play');
</script>

<div
  class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary-ink/20 bg-primary/5 px-4 py-3"
  data-testid="demo-persona-banner"
>
  <Eye class="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
  <p class="min-w-0 flex-1 text-sm">
    <span class="font-semibold">You're viewing a demo season as {personaName}.</span>
    <span class="text-muted-foreground">
      Everything is read-only — make it real with your own league.
    </span>
  </p>
  {#if !onHowToPlay}
    <a
      href="/demo/how-to-play"
      data-testid="demo-how-to-play-link"
      class="group -mx-2 inline-flex min-h-11 basis-full items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:basis-auto"
    >
      <CircleHelp class="size-4 shrink-0" aria-hidden="true" />
      <!-- Resting (not hover-only) underline as the link's sole colour-independent affordance:
           #868 took the gold off this label. Gold is the demo chrome's accent everywhere (the
           DEMO chip, sign-up button, selected tab), so a gold link read as a second CTA — DESIGN
           P6 wants one. Neutral ink + a resting underline keeps it a link while the nav's sign-up
           button stays the demo's one gold CTA. Carried on the span so the rule clears the icon. -->
      <span
        class="underline decoration-muted-foreground/60 underline-offset-4 transition-colors group-hover:decoration-foreground"
      >
        How to play
      </span>
    </a>
  {/if}
</div>
