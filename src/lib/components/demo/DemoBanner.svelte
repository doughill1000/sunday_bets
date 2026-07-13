<script lang="ts">
  // Persistent "you're inhabiting a persona, this is a demo" banner (#460, ADR-0026). Explains
  // the "you" lens (personalized surfaces render from this player's frozen payload). Conversion
  // lives in the single sticky nav CTA, not here — the demo keeps exactly one sign-up button.
  import Eye from '@lucide/svelte/icons/eye';

  let { personaName }: { personaName: string } = $props();
</script>

<div
  class="flex flex-wrap items-center gap-3 rounded-xl border border-primary-ink/20 bg-primary/5 px-4 py-3"
  data-testid="demo-persona-banner"
>
  <Eye class="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
  <p class="flex-1 text-sm">
    <span class="font-semibold">You're viewing a demo season as {personaName}.</span>
    <span class="text-muted-foreground">
      Everything is read-only — make it real with your own league.
    </span>
  </p>
</div>
