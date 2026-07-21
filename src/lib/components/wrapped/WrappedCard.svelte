<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  let {
    label,
    value,
    sub,
    emoji
  }: {
    label: string;
    value: string;
    sub?: string;
    emoji?: string;
  } = $props();
</script>

<Card class="border-border/50 bg-card" data-testid="wrapped-card">
  <CardHeader class="pb-1">
    <CardTitle class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {label}
    </CardTitle>
  </CardHeader>
  <CardContent class="pt-0">
    <p class="text-3xl leading-none font-bold text-foreground">
      {#if emoji}<span class="mr-1">{emoji}</span>{/if}{value}
    </p>
    {#if sub}
      <p class="mt-1 text-sm text-muted-foreground">{sub}</p>
    {/if}
  </CardContent>
</Card>
