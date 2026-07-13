<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchRecap } from '$lib/query/fetchers';
  import type { RecapCachePayload } from '$lib/query/types';
  import type { PageData } from './$types';
  import RecapCard from '$lib/components/recap/RecapCard.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import SeasonShelf from '$lib/components/recap/SeasonShelf.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  let { data: pageData }: { data: PageData } = $props();

  // The shareable Recap payload (recent prose + weekly hardware/shelf) comes from a cached
  // `createQuery` keyed by `(groupId, season)`: a revisit renders the last value instantly
  // and revalidates in the background (ADR-0033, issue #602). `pageData.initialRecap` is
  // the server-prefetched value (present on the initial/SSR request) used as `initialData`,
  // so first paint has no flash.
  const recapQuery = createQuery(() => ({
    queryKey: queryKeys.recap(pageData.groupId, pageData.seasonYear),
    queryFn: () => fetchRecap(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialRecap
  }));

  const EMPTY_RECAP: RecapCachePayload = {
    recaps: [],
    weeklyAwards: { season_year: 0, weeks: [], shelf: [] }
  };

  const data = $derived(recapQuery.data ?? EMPTY_RECAP);

  const weeks = $derived(data.weeklyAwards.weeks);
  const shelf = $derived(data.weeklyAwards.shelf);

  // Prose recap (if one was generated) keyed by week number, so each graded week can pair
  // its hardware with the AI recap for the same week.
  const recapByWeek = $derived(new Map(data.recaps.map((r) => [r.week_number, r])));

  // Any prose recaps for weeks not in the graded-week list still show, so no recap is ever
  // hidden by the hardware completeness gate.
  const orphanRecaps = $derived(
    data.recaps.filter((r) => !weeks.some((w) => w.week_number === r.week_number))
  );
</script>

<div class="mx-auto max-w-2xl space-y-4 px-4 py-6">
  <div class="flex items-center gap-2">
    <Sparkles class="h-5 w-5 text-primary-ink" />
    <h1 class="text-xl font-semibold">League Recaps</h1>
  </div>

  {#if weeks.length === 0 && data.recaps.length === 0}
    <p class="text-sm text-muted-foreground">
      No weekly hardware yet — awards mint after each week grades.
    </p>
  {:else}
    {#if shelf.length > 0}
      <SeasonShelf {shelf} currentUserId={pageData.currentUserId} />
    {/if}

    <div class="space-y-4">
      {#each weeks as hardware (hardware.week_number)}
        <div class="space-y-3">
          <WeeklyHardware {hardware} currentUserId={pageData.currentUserId} />
          {#if recapByWeek.has(hardware.week_number)}
            <RecapCard recap={recapByWeek.get(hardware.week_number)!} />
          {/if}
        </div>
      {/each}

      {#each orphanRecaps as recap (recap.id)}
        <RecapCard {recap} />
      {/each}
    </div>
  {/if}
</div>
