<script lang="ts">
  // "Every split" situational explorer (issue #514): the browsable counterpart to the career
  // "Your edge" hero. A chip nav walks the four dimensions one at a time (APG radiogroup, mirroring
  // the /league Trends selector), and the active dimension lays out EVERY bucket as a bar diverging
  // from the league line — right + green = beat the market, left + red = trail. Career or any
  // season, driven by the scope dropdown above it; thin cuts dim to a "needs N more" state instead
  // of plotting noise. The layout + guard live in the pure `situationalExplorer` transform; this
  // component only draws it.
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { EXPLORER_MIN_SAMPLE, formatAccuracy } from '$lib/utils/stats';
  import type { ExplorerBucket, ExplorerDimension } from '$lib/utils/stats';
  import type { SituationalDimension } from '$lib/types/server/stats';
  import ChipRadiogroup from './ChipRadiogroup.svelte';

  let {
    dimensions,
    scopeLabel,
    isYou,
    displayName,
    value,
    onchange
  }: {
    /** Explorer dimensions for the selected player + scope, already computed by situationalExplorer. */
    dimensions: ExplorerDimension[];
    /** Human scope label the explorer follows, e.g. "Career" or "2025". */
    scopeLabel: string;
    isYou: boolean;
    displayName: string;
    /** The selected cut, owned by the page so the choice survives a season change (see below). */
    value: SituationalDimension | null;
    /** Fired when the user picks a cut; the page persists it as page-level state. */
    onchange: (dimension: SituationalDimension) => void;
  } = $props();

  const subject = $derived(isYou ? 'you' : displayName);

  // Active dimension: the caller's chip choice, falling back to the first available cut so no
  // $effect is needed to reset when the scope changes the available set (same pattern as /league).
  // The choice itself is a *controlled* prop, held on the page rather than as $state here: a season
  // change re-keys the stats query, which unmounts this card to a skeleton and remounts it once the
  // new season loads — page-level state survives that round-trip, component-internal state would
  // reset to the first cut every time (#514).
  const availableIds = $derived(dimensions.map((d) => d.dimension));
  const activeId = $derived(
    value && availableIds.includes(value) ? value : (availableIds[0] ?? null)
  );
  const active = $derived(dimensions.find((d) => d.dimension === activeId) ?? null);
  const chipOptions = $derived(
    dimensions.map((dimension) => ({ value: dimension.dimension, label: dimension.label }))
  );

  // Fixed, honest scale: a 15-percentage-point edge fills the half-track, so small edges look small
  // (never auto-stretched to fill the axis). Clamped so a rare large edge can't overflow.
  const MAX_HALF = 50;
  const FILL_AT_POINTS = 15;
  const barWidth = (delta: number) =>
    Math.min(MAX_HALF, (Math.abs(delta) * 100 * MAX_HALF) / FILL_AT_POINTS);
  const deltaLabel = (delta: number) =>
    `${delta >= 0 ? '+' : '−'}${Math.round(Math.abs(delta) * 100)}%`;
  const record = (b: ExplorerBucket) =>
    `${b.wins}-${b.losses}${b.pushes > 0 ? `-${b.pushes}` : ''}`;
</script>

<Card data-testid="stats-situational-explorer">
  <CardHeader>
    <div class="flex items-center justify-between gap-3">
      <CardTitle>Every split</CardTitle>
      <span class="shrink-0 font-mono text-xs text-muted-foreground">follows {scopeLabel}</span>
    </div>
    <CardDescription>
      Where {subject} beat or trail the market in each situation — one cut at a time.
    </CardDescription>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if !active}
      <p class="text-sm text-muted-foreground">
        No situational splits for {subject}
        {scopeLabel === 'Career' ? 'yet' : `in ${scopeLabel}`} — they appear once games are graded.
      </p>
    {:else}
      <!-- A radiogroup, not a tablist: "pick one cut to view" is a radio choice, and the detail
           region below is what it drives (matches the /league Trends chip selector). -->
      <ChipRadiogroup
        options={chipOptions}
        value={activeId ?? ''}
        ariaLabel="Situational cut"
        idPrefix="stats-cut-tab"
        onchange={(v) => onchange(v as SituationalDimension)}
      />

      <div
        id="stats-cut-panel"
        role="region"
        aria-label="{active.label} detail"
        data-testid="stats-cut-panel"
        class="space-y-3"
      >
        <div
          class="flex justify-between font-mono text-[0.6rem] tracking-wide text-muted-foreground uppercase"
        >
          <span>◂ trail</span><span>league</span><span>beat ▸</span>
        </div>

        <ul class="space-y-3">
          {#each active.buckets as b (b.bucket)}
            <li class="grid gap-1 {b.isThin ? 'opacity-60' : ''}">
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-sm font-medium">{b.label}</span>
                {#if b.delta != null}
                  <span
                    class="font-mono text-sm font-bold tabular-nums {b.delta >= 0
                      ? 'text-success'
                      : 'text-destructive'}"
                  >
                    {deltaLabel(b.delta)}
                  </span>
                {:else}
                  <span class="font-mono text-xs text-muted-foreground">thin</span>
                {/if}
              </div>

              <!-- Diverging track: centre line is the league cover rate; the bar grows from it. -->
              <div
                class="relative h-4 rounded-[5px]"
                style="background: linear-gradient(90deg, color-mix(in oklab, var(--destructive) 9%, transparent), transparent 48%, transparent 52%, color-mix(in oklab, var(--success) 9%, transparent));"
                aria-hidden="true"
              >
                <span
                  class="absolute inset-y-[-3px] left-1/2 w-px -translate-x-1/2 bg-foreground/40"
                ></span>
                {#if b.delta != null && b.delta >= 0}
                  <span
                    class="absolute inset-y-1 left-1/2 rounded-[3px] bg-success"
                    style="width: {barWidth(b.delta)}%"
                  ></span>
                {:else if b.delta != null}
                  <span
                    class="absolute inset-y-1 right-1/2 rounded-[3px] bg-destructive"
                    style="width: {barWidth(b.delta)}%"
                  ></span>
                {/if}
              </div>

              <p class="font-mono text-[0.65rem] text-muted-foreground tabular-nums">
                {#if b.isThin && b.needed > 0}
                  {b.decisions} of {EXPLORER_MIN_SAMPLE} picks · needs {b.needed} more
                {:else if b.isThin}
                  you {formatAccuracy(b.accuracy)} · {record(b)} · no market line
                {:else}
                  you {formatAccuracy(b.accuracy)} · league {formatAccuracy(b.leagueAccuracy)} · {record(
                    b
                  )}
                {/if}
              </p>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </CardContent>
</Card>
