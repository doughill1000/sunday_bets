<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import type { RecapRow } from '$lib/server/db/queries/recaps';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';

  let { recap, compact = false }: { recap: RecapRow; compact?: boolean } = $props();

  let expanded = $state(!compact);

  const weekLabel = $derived(`Week ${recap.week_number} Recap`);
  const isFallback = $derived(recap.is_fallback);
</script>

<Card class="border-border/50 bg-card">
  <CardHeader class="pb-2">
    <CardTitle class="flex items-center gap-2 text-base font-semibold">
      <Sparkles class="h-4 w-4 shrink-0 text-primary-ink" />
      {weekLabel}
      {#if compact}
        <button
          class="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          onclick={() => (expanded = !expanded)}
          aria-label={expanded ? 'Collapse recap' : 'Expand recap'}
        >
          {#if expanded}
            <ChevronUp class="h-4 w-4" />
          {:else}
            <ChevronDown class="h-4 w-4" />
          {/if}
        </button>
      {/if}
    </CardTitle>
  </CardHeader>

  {#if expanded}
    <CardContent>
      <p class="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{recap.prose}</p>
      {#if isFallback}
        <p class="mt-2 text-xs text-muted-foreground italic">
          AI commentary unavailable this week — deterministic summary shown.
        </p>
      {/if}
    </CardContent>
  {/if}
</Card>
