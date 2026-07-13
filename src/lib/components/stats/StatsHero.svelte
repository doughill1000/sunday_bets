<script lang="ts">
  // Scope-aware stats hero (issue #567): the single card leading the scoped content on /stats,
  // replacing the three stacked preamble cards (YourEdge + CareerSummary/season-snapshot +
  // SignatureTendencies). Its two halves — the headline number line (Record · ATS% · Decisions)
  // and the signature tells — both follow the season/Career scope, so one dropdown re-scopes the
  // whole hero. Analytics only: standings/rank live on the Leaderboard (ADR-0018), so no
  // "Standings points" tile appears here. Pure presentation over already-derived values.
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { formatAccuracy } from '$lib/utils/stats';
  import type { SignatureTell } from '$lib/utils/stats';
  import SignatureTells from './SignatureTells.svelte';

  let {
    isYou,
    displayName,
    scopeLabel,
    wins,
    losses,
    pushes,
    missed,
    atsAccuracy,
    decisions,
    tells
  }: {
    isYou: boolean;
    displayName: string;
    /** Human scope label the hero follows, e.g. "Career" or "2025". */
    scopeLabel: string;
    wins: number;
    losses: number;
    pushes: number;
    missed: number;
    /** Cover rate for the scope, or null when there are no decided picks yet. */
    atsAccuracy: number | null;
    decisions: number;
    /** Ranked signature tells for the same scope (career or season). */
    tells: SignatureTell[];
  } = $props();

  const subjectCap = $derived(isYou ? 'You' : displayName);
  const subject = $derived(isYou ? 'you' : displayName);
  const possessive = $derived(isYou ? 'Your' : `${displayName}'s`);
</script>

<Card data-testid="stats-hero">
  <CardHeader>
    <div class="flex items-center justify-between gap-3">
      <CardTitle class="text-2xl">{subjectCap}</CardTitle>
      <span class="shrink-0 font-mono text-xs text-muted-foreground">{scopeLabel}</span>
    </div>
    <CardDescription
      >How {subject} play the board — the numbers and the tells behind them.</CardDescription
    >
  </CardHeader>
  <CardContent class="space-y-5">
    <!-- Analytics only: standings score + rank live on the Leaderboard (ADR-0018). These tiles
         describe actual performance against the spread, always raw. -->
    <dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Record (W-L-P)</dt>
        <dd class="text-2xl font-bold tabular-nums">{wins}-{losses}-{pushes}</dd>
        {#if missed > 0}
          <p class="text-xs text-muted-foreground">{missed} missed</p>
        {/if}
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">ATS accuracy</dt>
        <dd class="text-2xl font-bold">{formatAccuracy(atsAccuracy)}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Decisions</dt>
        <dd class="text-2xl font-bold">{decisions}</dd>
      </div>
    </dl>

    <div class="border-t pt-4">
      <p class="mb-2.5 text-xs font-medium text-muted-foreground">{possessive} signature</p>
      <SignatureTells {tells} {isYou} {displayName} />
    </div>
  </CardContent>
</Card>
