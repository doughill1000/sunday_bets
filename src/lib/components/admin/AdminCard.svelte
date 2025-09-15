<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

  export let title = '';
  export let subtitle: string | null = null;
</script>

<!-- Uses shadcn-svelte Card primitives -->
<Card class="p-6">
  <CardHeader class="mb-4 flex items-center justify-between">
    <CardTitle class="text-xl font-bold">{title}</CardTitle>
    {#if subtitle}
      <CardDescription class="text-sm text-muted-foreground">{subtitle}</CardDescription>
    {/if}
  </CardHeader>
  <CardContent>
    <slot />
  </CardContent>
</Card>
