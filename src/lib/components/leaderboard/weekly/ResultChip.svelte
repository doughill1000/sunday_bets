<!-- src/lib/components/leaderboard/weekly/ResultChip.svelte -->
<script lang="ts">
  export let result: 'W' | 'L' | 'P' | 'M' | null | undefined = null;

  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

  // derive tone + full class string reactively
  $: tone =
    result === 'W'
      ? 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/20'
      : result === 'L'
        ? 'bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/20'
        : result === 'P'
          ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20'
          : 'bg-zinc-500/10 text-zinc-700 ring-1 ring-zinc-500/20';

  $: cls = `${base} ${tone}`;
</script>

{#if result}
  <span class={cls}>{result}</span>
{/if}
