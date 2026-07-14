<script lang="ts">
  // The Week tab's single context control (#631), lifted out of WeeklyPicksBreakdown so the
  // picker sits ABOVE everything it drives. The Week tab now leads with that week's hardware,
  // and a selector rendered below its own output reads as belonging to the breakdown alone
  // rather than to the whole week. Mirrors the role the Season/All-time scope bar plays on
  // Standings: one control per tab, at the top of the tab.
  import { goto } from '$app/navigation';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
  } from '$lib/components/ui/dropdown-menu';
  import { weekLabel } from '$lib/utils/weekLabel';
  import type { SeasonWeekOption } from '$lib/types/leaderboard';

  let {
    weeks,
    selectedWeek
  }: {
    weeks: SeasonWeekOption[];
    selectedWeek: SeasonWeekOption | null;
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
</script>

<div class="flex items-center justify-between gap-2" data-testid="week-navigator">
  <Button variant="outline" size="sm" onclick={prev} disabled={!hasPrev} aria-label="Previous week">
    <ChevronLeft class="size-4" aria-hidden="true" />
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="sm"
          class="flex items-center gap-1 text-sm font-medium"
          aria-label="Jump to week"
        >
          {weekLabel(selectedWeek)}
          <svg
            class="h-3 w-3 shrink-0 opacity-60"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </Button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="center" class="max-h-64 overflow-y-auto">
      {#each weeks as w (w.weekNumber)}
        <DropdownMenuItem class="cursor-pointer" onclick={() => navigate(w.weekNumber)}>
          <span class="flex-1">{weekLabel(w)}</span>
          {#if selectedWeek?.weekNumber === w.weekNumber}
            <svg
              class="ml-2 h-4 w-4 shrink-0 text-primary-ink"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clip-rule="evenodd"
              />
            </svg>
          {/if}
        </DropdownMenuItem>
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
  <Button variant="outline" size="sm" onclick={next} disabled={!hasNext} aria-label="Next week">
    <ChevronRight class="size-4" aria-hidden="true" />
  </Button>
</div>
