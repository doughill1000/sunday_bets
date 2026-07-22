<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { goto } from '$app/navigation';
  import { queryKeys } from '$lib/query/keys';
  import { fetchRecap } from '$lib/query/fetchers';
  import type { RecapCachePayload } from '$lib/query/types';
  import type { PageData } from './$types';
  import { seasonScopeOptions } from '$lib/utils/stats';
  import RecapCard from '$lib/components/recap/RecapCard.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  let { data: pageData }: { data: PageData } = $props();

  // The shareable Recap payload (recent prose + weekly hardware/shelf) comes from a cached
  // `createQuery` keyed by `(groupId, season)`: a revisit renders the last value instantly
  // and revalidates in the background (ADR-0033, issue #602). `pageData.initialRecap` is
  // the server-prefetched value (present on the initial/SSR request) used as `initialData`,
  // so first paint has no flash. The League Week tab reads this SAME cache entry for its
  // per-week hardware (#631), so the two surfaces cannot disagree about a week's awards.
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

  // Prose recap (if one was generated) keyed by week number, so each graded week can pair
  // its hardware with the AI recap for the same week.
  const recapByWeek = $derived(new Map(data.recaps.map((r) => [r.week_number, r])));

  // Any prose recaps for weeks not in the graded-week list still show, so no recap is ever
  // hidden by the hardware completeness gate.
  const orphanRecaps = $derived(
    data.recaps.filter((r) => !weeks.some((w) => w.week_number === r.week_number))
  );

  // Minimal season select (#739) — same option model as the `/league` Standings scope, minus
  // the All-time option (there is no all-time recap archive). Pins "This season · YYYY" only
  // while the newest season is in progress; older seasons list newest-first. `pageData.seasonYear`
  // is always in the option set (seeded from the server's `resolveSeasonYear`), so the select
  // always reflects what is on screen even for an out-of-range/explicit `?season=`.
  const scopeOptions = $derived(
    seasonScopeOptions(
      [...pageData.availableSeasons, pageData.seasonYear],
      pageData.latestSeasonInProgress
    )
  );
  // Total selectable seasons; the picker only earns its place once there is a past season to
  // reach — a single-season league has nothing to switch between.
  const seasonCount = $derived(
    (scopeOptions.latest !== null ? 1 : 0) + scopeOptions.pastSeasons.length
  );

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

  // Changing the season navigates so the season-scoped recap query re-keys (ADR-0017) — the
  // `?season=` param is also the shareable, deep-linkable contract that push notifications and
  // the Week tab produce (#739).
  function onSeasonChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (value === String(pageData.seasonYear)) return;
    const url = new URL(window.location.href);
    url.searchParams.set('season', value);
    void goto(url.toString(), { invalidateAll: true, noScroll: true });
  }
</script>

<svelte:head>
  <title>Season recaps | Hotshot</title>
</svelte:head>

<!-- The Season recaps archive (#631). Built long before it had a door: the authed nav linked here
     nowhere, so it was reachable only via the RecapFlash toast. It is now the destination of the
     League honors CTA and of every Week tab's hardware recap link, which deep-link to the
     `#week-N` anchors below. It stays a CTA-reached archive; the season-long trophy shelf moved
     to the /league Honors tab (#741), which finally has room for it beneath the curated awards —
     leaving this page the pure week-by-week archive: prose + per-week hardware, newest first. -->
<div class="mx-auto max-w-2xl space-y-4 px-4 py-6">
  <div>
    <a
      href="/league"
      class="text-sm text-muted-foreground transition-colors hover:text-foreground"
      data-testid="recaps-back">← League</a
    >
    <div class="mt-1 flex items-center gap-2">
      <Sparkles class="h-5 w-5 text-primary-ink" />
      <h1 class="text-xl font-semibold">Season recaps</h1>
    </div>
    <p class="text-sm text-muted-foreground">
      Every graded week's hardware and the Commissioner's take, newest first.
    </p>

    {#if seasonCount > 1}
      <!-- Makes past seasons reachable (#739): without it, an off-season visit was pinned to the
           last graded season with no way back to earlier archives. -->
      <div class="mt-3 flex items-center gap-2">
        <span
          id="recap-season-label"
          class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Season</span
        >
        <select
          class={SELECT_CLASS}
          value={String(pageData.seasonYear)}
          onchange={onSeasonChange}
          aria-labelledby="recap-season-label"
          data-testid="recap-season"
        >
          {#if scopeOptions.latest !== null}
            <option value={String(scopeOptions.latest)}>This season · {scopeOptions.latest}</option>
          {/if}
          {#if scopeOptions.pastSeasons.length > 0}
            <optgroup label="Past seasons">
              {#each scopeOptions.pastSeasons as year (year)}
                <option value={String(year)}>{year}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
      </div>
    {/if}
  </div>

  {#if weeks.length === 0 && data.recaps.length === 0}
    <p class="text-sm text-muted-foreground">
      No weekly hardware yet — awards mint after each week grades.
    </p>
  {:else}
    <div class="space-y-4">
      {#each weeks as hardware (hardware.week_number)}
        <!-- `scroll-mt-20` keeps the anchored week clear of the sticky app header when a Week
             tab recap link deep-links straight to it. -->
        <div class="scroll-mt-20 space-y-3" id="week-{hardware.week_number}">
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
