<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

  interface Props {
    title?: string;
    subtitle?: string | null;
    children?: Snippet;
  }

  let { title = '', subtitle = null, children }: Props = $props();
</script>

<!-- Uses shadcn-svelte Card primitives -->
<Card class="p-6">
  <CardHeader class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <CardTitle class="text-xl font-bold">{title}</CardTitle>
    {#if subtitle}
      <CardDescription class="text-sm text-muted-foreground">{subtitle}</CardDescription>
    {/if}
  </CardHeader>
  <CardContent>
    {@render children?.()}
  </CardContent>
</Card>
