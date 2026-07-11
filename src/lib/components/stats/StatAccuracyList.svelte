<script lang="ts">
  // Cover-% meter list for the /stats accuracy breakdowns (issue #518). Replaces the old
  // right-aligned Win% table cell — which clipped off a 390px screen (July design review) —
  // with the shared CoverMeter: the bar + 50% tick say "above or below a coin flip"
  // pre-attentively, and the exact figure + W-L-P record ride alongside. Used for both the
  // by-team and by-weight cuts, season and career. Presentational; the caller maps its rows
  // (team short name / weight label, All-In flag) into this normalized shape.
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { formatAccuracy } from '$lib/utils/stats';

  type Row = {
    key: string | number;
    /** Team short name or weight label; ignored for All-In rows (a badge stands in). */
    label: string;
    /** Full team name for the hover title, when the label is an abbreviation. */
    title?: string;
    /** All-In weight — rendered as a highlighted badge row. */
    isAllIn?: boolean;
    wins: number;
    losses: number;
    pushes: number;
    /** Cover fraction in [0, 1], or null for a decision-less split. */
    accuracy: number | null;
    points: number;
  };

  let { rows }: { rows: Row[] } = $props();
</script>

<ul class="space-y-3">
  {#each rows as row (row.key)}
    <li class={row.isAllIn ? '-mx-2 rounded-lg bg-primary/5 px-2 py-1.5' : ''}>
      <div class="flex items-baseline justify-between gap-2 text-sm">
        <span class="flex min-w-0 items-center gap-2">
          {#if row.isAllIn}
            <Badge>All-In</Badge>
          {:else}
            <span class="truncate font-medium" title={row.title}>{row.label}</span>
          {/if}
        </span>
        <span class="flex shrink-0 items-baseline gap-2">
          <span class="font-mono tabular-nums">{formatAccuracy(row.accuracy)}</span>
          <span class="text-xs text-muted-foreground tabular-nums">
            {row.wins}-{row.losses}-{row.pushes} · {row.points} pt{Math.abs(row.points) === 1
              ? ''
              : 's'}
          </span>
        </span>
      </div>
      <CoverMeter pct={row.accuracy} class="mt-1.5" />
    </li>
  {/each}
</ul>
