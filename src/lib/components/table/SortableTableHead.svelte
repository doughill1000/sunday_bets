<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import { Button } from '$lib/components/ui/button';
  import { TableHead } from '$lib/components/ui/table';

  type Direction = 'asc' | 'desc';

  let {
    label,
    direction = null,
    align = 'left',
    onsort
  }: {
    label: string;
    /** Active sort direction for this column, or `null` when another column is sorted. */
    direction?: Direction | null;
    align?: 'left' | 'right';
    onsort: () => void;
  } = $props();

  const ariaSort = $derived(
    direction === null ? 'none' : direction === 'asc' ? 'ascending' : 'descending'
  );

  // Clicking an active column flips it, so announce the direction the next click produces.
  const actionLabel = $derived(
    direction === null
      ? `Sort by ${label}`
      : `Sort by ${label} ${direction === 'asc' ? 'descending' : 'ascending'}`
  );
</script>

<TableHead class={align === 'right' ? 'text-right' : undefined} aria-sort={ariaSort}>
  <Button
    variant="ghost"
    size="sm"
    class={align === 'right' ? '-mr-2 ml-auto px-2' : '-ml-2 px-2'}
    aria-label={actionLabel}
    title={actionLabel}
    onclick={onsort}
  >
    {label}
    {#if direction === 'asc'}
      <ArrowUp class="size-3.5" aria-hidden="true" />
    {:else if direction === 'desc'}
      <ArrowDown class="size-3.5" aria-hidden="true" />
    {:else}
      <ArrowUpDown class="size-3.5 text-muted-foreground" aria-hidden="true" />
    {/if}
  </Button>
</TableHead>
