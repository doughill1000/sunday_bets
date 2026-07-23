<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchRecap } from '$lib/query/fetchers';
  import type { RecapCachePayload } from '$lib/query/types';
  import type { PageData } from './$types';
  import WeeklyPicksBreakdown from '$lib/components/leaderboard/WeeklyPicksBreakdown.svelte';
  import WeekNavigator from '$lib/components/leaderboard/WeekNavigator.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import AwardsGuide from '$lib/components/AwardsGuide.svelte';
  import { weekLabel } from '$lib/utils/weekLabel';

  let { data: pageData }: { data: PageData } = $props();

  // The week's hardware (#631) rides the SAME `['recap', groupId, season]` cache entry that
  // /recap and the /league Honors shelf own (ADR-0033, #602), so no surface can disagree about a
  // week's awards. `+page.ts` prefetches it on the server for a flash-free first paint; a
  // client-side week switch re-renders from cache and revalidates in the background (ADR-0017).
  // The user-scoped pick breakdown stays on `pageData` (server load, boundary 3).
  const recapQuery = createQuery(() => ({
    queryKey: queryKeys.recap(pageData.groupId, pageData.seasonYear),
    queryFn: () => fetchRecap(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialRecap
  }));

  const EMPTY_RECAP: RecapCachePayload = {
    recaps: [],
    weeklyAwards: { season_year: 0, weeks: [], shelf: [] }
  };
  const recap = $derived(recapQuery.data ?? EMPTY_RECAP);

  // The selected week's hardware, plus the prose recap for that same week if one was generated.
  // Hardware only exists for FULLY-graded scoring weeks, so both are null on an in-progress week
  // and on every preseason round (ADR-0016 non-scoring rounds never mint awards).
  const selectedHardware = $derived(
    pageData.selectedWeek != null
      ? (recap.weeklyAwards.weeks.find(
          (w) => w.week_number === pageData.selectedWeek?.weekNumber
        ) ?? null)
      : null
  );
  const selectedWeekRecap = $derived(
    pageData.selectedWeek != null
      ? (recap.recaps.find((r) => r.week_number === pageData.selectedWeek?.weekNumber) ?? null)
      : null
  );

  const subtitle = $derived(`${pageData.seasonYear} season · ${weekLabel(pageData.selectedWeek)}.`);

  // Full-bleed sticky context bar, matching the Standings/Honors scope bars so one-control-per-tab
  // reads as one pattern across the app. Sticks under the app header (h-14) as the panel grows.
  const SCOPE_BAR_CLASS =
    'sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75';
</script>

<svelte:head>
  <title>Week | Hotshot</title>
</svelte:head>

<!-- The Week destination (#776): promoted from `/league`'s third tab to its own nav slot. The
     panel's internals are unchanged from the `?view=weekly` tab (#631/#741) — the week picker, the
     week's hardware + awards legend, and the user-scoped pick breakdown — only its address moved. -->
<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="week-heading">
  <div class="min-w-0">
    <h1 id="week-heading" data-testid="week-heading" class="text-3xl font-bold tracking-tight">
      Week
    </h1>
    <p class="mt-1 text-muted-foreground" data-testid="week-subtitle">{subtitle}</p>
  </div>

  <!-- Week's one control, sitting above everything it drives (#631). Rendered even with zero
       weeks — the navigator's "No weeks started" and the breakdown's own empty state are the
       designed zero-states, exactly as the old /league panel behaved. -->
  <div data-testid="week-scope-bar" class={SCOPE_BAR_CLASS}>
    <span
      id="week-scope-label"
      class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Week</span
    >
    <WeekNavigator weeks={pageData.weeks} selectedWeek={pageData.selectedWeek} />
  </div>

  <div class="mt-4 space-y-4">
    <!-- The week leads with its hardware (#631), then the pick breakdown. The AI recap is a link
         into the Season recaps archive rather than an inline RecapCard, so the page stays tight
         and the archive remains the one place the prose lives. Hardware exists only for
         fully-graded scoring weeks, so an in-progress week shows the breakdown alone. -->
    {#if selectedHardware}
      <!-- The weekly-hardware legend (#771) rides in the card header now (#780), top-right of the
           "Week N hardware" title, instead of dangling below the card as a stray link. Scoped to
           weekly hardware — the only tier this tab shows — so it no longer opens on season titles
           that live over on the Honors tab. -->
      <WeeklyHardware
        hardware={selectedHardware}
        currentUserId={pageData.currentUserId}
        recapHref="/recap?season={pageData.seasonYear}#week-{selectedHardware.week_number}"
        recapLabel={selectedWeekRecap
          ? `Read the ${weekLabel(pageData.selectedWeek)} recap`
          : 'Season recaps'}
      >
        {#snippet legend()}
          <AwardsGuide scope="weekly" />
        {/snippet}
      </WeeklyHardware>
    {/if}

    <WeeklyPicksBreakdown
      weeks={pageData.weeks}
      selectedWeek={pageData.selectedWeek}
      breakdown={pageData.breakdown}
    />
  </div>
</section>
