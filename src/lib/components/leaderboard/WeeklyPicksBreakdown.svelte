<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
  import WeeklyPickCard from './WeeklyPickCard.svelte';
  import type { SeasonWeekOption, WeeklyGameBreakdown } from '$lib/types/leaderboard';

  let {
    weeks,
    selectedWeek,
    breakdown
  }: {
    weeks: SeasonWeekOption[];
    selectedWeek: SeasonWeekOption | null;
    breakdown: WeeklyGameBreakdown[];
  } = $props();

  const currentIndex = $derived(
    selectedWeek != null ? weeks.findIndex((w) => w.weekNumber === selectedWeek.weekNumber) : -1
  );
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex >= 0 && currentIndex < weeks.length - 1);

  function navigate(weekNumber: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'weekly');
    url.searchParams.set('week', String(weekNumber));
    void goto(url.toString(), { invalidateAll: true, noScroll: true, keepFocus: true });
  }

  function prev() {
    if (hasPrev) navigate(weeks[currentIndex - 1].weekNumber);
  }

  function next() {
    if (hasNext) navigate(weeks[currentIndex + 1].weekNumber);
  }

  // Preseason rounds are stored as negative week_number (ADR-0016); label them as such
  // rather than showing "Week -1".
  function weekLabel(w: SeasonWeekOption | null): string {
    if (w == null) return 'No weeks started';
    return w.weekNumber < 0 ? `Preseason ${-w.weekNumber}` : `Week ${w.weekNumber}`;
  }
</script>

<div class="space-y-4" data-testid="weekly-breakdown">
  <!-- Week navigator -->
  <div class="flex items-center justify-between gap-2">
    <Button variant="outline" size="sm" onclick={prev} disabled={!hasPrev}>◀</Button>
    <span class="text-sm font-medium">
      {weekLabel(selectedWeek)}
    </span>
    <Button variant="outline" size="sm" onclick={next} disabled={!hasNext}>▶</Button>
  </div>

  {#if selectedWeek && !selectedWeek.isScoring}
    <Alert data-testid="non-scoring-banner">
      <AlertTitle>This round doesn't count</AlertTitle>
      <AlertDescription>
        Results are shown for fun — they don't affect the season standings.
      </AlertDescription>
    </Alert>
  {/if}

  {#if weeks.length === 0}
    <p class="text-sm text-muted-foreground">No weeks have started yet.</p>
  {:else if breakdown.length === 0}
    <p class="text-sm text-muted-foreground">No games this week.</p>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each breakdown as game (game.gameId)}
        <WeeklyPickCard {game} />
      {/each}
    </div>
  {/if}
</div>
