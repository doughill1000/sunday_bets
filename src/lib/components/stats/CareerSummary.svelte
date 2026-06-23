<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { formatAccuracy } from '$lib/utils/stats';
  import type { AllTimeTotalsEntry } from '$lib/types/server/stats';

  let {
    entry,
    isYou
  }: {
    entry: AllTimeTotalsEntry;
    isYou: boolean;
  } = $props();

  const subjectLabel = $derived(isYou ? 'You' : entry.display_name);
  const atsAccuracy = $derived.by(() => {
    const decided = entry.wins + entry.losses;
    return decided > 0 ? entry.wins / decided : null;
  });
</script>

<Card>
  <CardHeader>
    <CardDescription>All-time career</CardDescription>
    <CardTitle class="text-2xl">{subjectLabel}</CardTitle>
  </CardHeader>
  <CardContent>
    <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Total points</dt>
        <dd class="text-2xl font-bold">{entry.total_points}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Record (W-L-P)</dt>
        <dd class="text-2xl font-bold tabular-nums text-white">
          {entry.wins}-{entry.losses}-{entry.pushes}
        </dd>
        {#if entry.missed > 0}
          <p class="text-xs text-muted-foreground">{entry.missed} missed</p>
        {/if}
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">ATS accuracy</dt>
        <dd class="text-2xl font-bold">{formatAccuracy(atsAccuracy)}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Decisions</dt>
        <dd class="text-2xl font-bold">{entry.decisions}</dd>
      </div>
    </dl>
  </CardContent>
</Card>
