<!-- src/lib/components/leaderboard/weekly/WeightChip.svelte -->
<script lang="ts">
  interface Props {
    weight: string;
  }

  let { weight }: Props = $props();
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
</script>

{#if weight !== null && weight !== undefined}
  <span class={`${base} bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200`} title="Weight">
    {weight}
  </span>
{/if}
