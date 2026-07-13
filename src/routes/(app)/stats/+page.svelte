<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchStats } from '$lib/query/fetchers';
  import type { StatsCachePayload } from '$lib/query/types';
  import type { SituationalDimension } from '$lib/types/server/stats';
  import type { PageData } from './$types';
  import StatsHero from '$lib/components/stats/StatsHero.svelte';
  import SeasonTrendChart from '$lib/components/stats/SeasonTrendChart.svelte';
  import SituationalExplorer from '$lib/components/stats/SituationalExplorer.svelte';
  import StatAccuracyList from '$lib/components/stats/StatAccuracyList.svelte';
  import TeamBook from '$lib/components/stats/TeamBook.svelte';
  import ChipRadiogroup from '$lib/components/stats/ChipRadiogroup.svelte';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import {
    headToHeadForUser,
    lineSideTendency,
    seasonScopeOptions,
    signatureTendencies,
    situationalEdges,
    situationalExplorer,
    teamBookStandouts
  } from '$lib/utils/stats';
  import { weightLabel } from '$lib/domain/scoring';

  let { data: pageData }: { data: PageData } = $props();

  // The heavy Stats payload (totals / accuracy / head-to-head) comes from a cached
  // `createQuery` keyed by `(groupId, season)`: a revisit renders the last value instantly
  // and revalidates in the background (ADR-0017). `pageData.initialStats` is the
  // server-prefetched value (present on the initial/SSR request) used as `initialData`, so
  // first paint has no flash; on a client-side cache miss the query loads and the skeleton
  // below shows. The light page `load` still supplies the season metadata + streamed career
  // detail, which merge over the query data.
  const statsQuery = createQuery(() => ({
    queryKey: queryKeys.stats(pageData.groupId, pageData.seasonYear),
    queryFn: () => fetchStats(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialStats,
    // A season switch re-keys this query, and client-side navigation ships no `initialData`, so
    // without this the new key would go `isPending` and blank the whole layout — including the
    // sticky context bar the user just touched — to skeletons. `keepPreviousData` holds the prior
    // season's data (with `isPlaceholderData`) until the new season loads, so the scope bar and
    // hero stay put and only the figures swap (audit S5, ADR-0017).
    placeholderData: keepPreviousData
  }));

  // Empty shape so the per-player/season derivations below stay valid while the query is
  // still loading on a cache miss (the pending branch in the template gates real render).
  // `seasonYear` here is a placeholder — `data` spreads `pageData` last, so the real
  // (reactive) season always wins.
  const EMPTY_STATS: StatsCachePayload = {
    seasonYear: 0,
    totals: [],
    allTimeTotals: [],
    dropActive: false,
    trend: [],
    teamAccuracy: [],
    weightAccuracy: [],
    headToHead: [],
    consensusStats: [],
    lineSide: [],
    streaks: [],
    situational: [],
    leagueSituationalBaseline: [],
    situationalSeason: [],
    leagueSituationalBaselineSeason: [],
    teamBook: [],
    teamBookAllTime: [],
    lineSideAllTime: []
  };

  // `pageData` is spread last so its (reactive) season metadata wins for shared keys; the
  // cached/empty payload supplies totals / accuracy / head-to-head.
  const data = $derived({ ...(statsQuery.data ?? EMPTY_STATS), ...pageData });

  // Light → All-In, so the highlighted All-In row sorts last.
  const WEIGHT_ORDER = ['L', 'M', 'H', 'A'];

  type BreakdownCut = 'team' | 'weight' | 'trend' | 'h2h';
  type BreakdownOption = { value: BreakdownCut; label: string };

  function breakdownOptions(
    hasTeam: boolean,
    hasWeight: boolean,
    hasTrend: boolean,
    hasH2H: boolean
  ): BreakdownOption[] {
    return [
      ...(hasTeam ? [{ value: 'team' as const, label: 'Team book' }] : []),
      ...(hasWeight ? [{ value: 'weight' as const, label: 'Weight' }] : []),
      ...(hasTrend ? [{ value: 'trend' as const, label: 'Trend' }] : []),
      ...(hasH2H ? [{ value: 'h2h' as const, label: 'H2H' }] : [])
    ];
  }

  function activeBreakdown(
    selectedCut: BreakdownCut,
    options: BreakdownOption[]
  ): BreakdownCut | null {
    return options.some((option) => option.value === selectedCut)
      ? selectedCut
      : (options[0]?.value ?? null);
  }

  let careerBreakdownCut = $state<BreakdownCut>('team');
  let seasonBreakdownCut = $state<BreakdownCut>('team');

  // The situational-explorer cut lives here (not inside SituationalExplorer) for the same reason as
  // the breakdown cuts above: a season change re-keys the stats query, unmounting the explorer to a
  // skeleton and remounting it when the new season loads. Page-level state survives that round-trip
  // so the chosen cut sticks; component-internal state would reset to the first cut each time. One
  // value is shared by both explorers — only one (career xor season) is ever mounted — so the cut
  // also carries across a scope switch (#514).
  let explorerCut = $state<SituationalDimension | null>(null);

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

  const orderedPlayersForPicker = $derived.by(() => {
    const you = data.allTimeTotals.find((t) => t.user_id === data.currentUserId);
    const others = data.allTimeTotals.filter((t) => t.user_id !== data.currentUserId);
    return you ? [you, ...others] : data.allTimeTotals;
  });

  // Plain `$state`, set explicitly and otherwise left alone — a `$derived` here would
  // recompute (and stomp the user's pick) whenever `data.allTimeTotals` gets a new object
  // identity, which happens on every season change via `goto`. The `$effect` below only steps
  // in to pick a default/repair an invalid selection, never to "follow" the season.
  let selectedUserId = $state<string | null>(null);
  $effect(() => {
    if (selectedUserId !== null && data.allTimeTotals.some((t) => t.user_id === selectedUserId)) {
      return;
    }
    selectedUserId = data.allTimeTotals.some((t) => t.user_id === data.currentUserId)
      ? data.currentUserId
      : (data.allTimeTotals[0]?.user_id ?? null);
  });

  // ── Scope: player + season/Career fold into one context bar (#518) ──────────────
  // The Season/Career tab is gone. `scope` is a single value: 'season' shows the season
  // resolved from the URL, 'career' the all-time view. Switching to Career is a pure
  // client-side view flip (career data always loads); changing the *season* navigates so the
  // season-scoped query re-keys (ADR-0017). Because a full navigation re-mounts nothing, the
  // scope is set before `goto` so it survives the reload as 'season'.
  let scope = $state<'season' | 'career'>('season');
  // Fold the currently-displayed season into the option set so the dropdown can always
  // represent `scopeValue`. `resolveSeasonYear` can land on a season with no settled picks
  // yet — a brand-new/pre-grading season (empty `availableSeasons` → the active season year),
  // or an out-of-range `?season=` — and `availableSeasons` is derived from graded standings
  // only (`group_season_years`), so that season is absent from it. Without this the <select>
  // value would match no <option>, silently blanking the control to `''` while the empty
  // state still reads "No settled picks for <year>." (mirrors the /leaderboard scope fix).
  const scopeOptions = $derived(seasonScopeOptions([...data.availableSeasons, data.seasonYear]));
  const scopeValue = $derived(scope === 'career' ? 'career' : String(data.seasonYear));

  function onScopeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (value === 'career') {
      scope = 'career';
      return;
    }
    scope = 'season';
    if (value !== String(data.seasonYear)) {
      const url = new URL(window.location.href);
      url.searchParams.set('season', value);
      void goto(url.toString(), { noScroll: true });
    }
  }

  function onPlayerChange(e: Event) {
    selectedUserId = (e.target as HTMLSelectElement).value;
  }

  const selected = $derived(data.totals.find((t) => t.user_id === selectedUserId) ?? null);
  const selectedCareer = $derived(
    data.allTimeTotals.find((t) => t.user_id === selectedUserId) ?? null
  );
  const isSelectedYou = $derived(selectedUserId === data.currentUserId);
  const selectedDisplayName = $derived(
    selected?.display_name ?? selectedCareer?.display_name ?? ''
  );
  const subjectLabel = $derived(isSelectedYou ? 'You' : selectedDisplayName);
  const emptyStateSubject = $derived(isSelectedYou ? 'you' : selectedDisplayName);
  const possessive = $derived(isSelectedYou ? 'Your' : `${selectedDisplayName}'s`);

  const atsAccuracy = $derived.by(() => {
    if (!selected) return null;
    const decided = selected.wins + selected.losses;
    return decided > 0 ? selected.wins / decided : null;
  });

  // Career cover rate for the hero's number line — the all-time counterpart to `atsAccuracy`.
  const careerAtsAccuracy = $derived.by(() => {
    if (!selectedCareer) return null;
    const decided = selectedCareer.wins + selectedCareer.losses;
    return decided > 0 ? selectedCareer.wins / decided : null;
  });

  // Favorite/underdog lean for the selected player, at both scopes (#564): the season lean feeds
  // the season signature strip, the career lean (pooled across seasons) the career one. Each is
  // sample-guarded by lineSideTendency and collapses a within-10-points mix to 'balanced'.
  const lineSide = $derived(
    lineSideTendency(data.lineSide.find((r) => r.user_id === selectedUserId))
  );
  const careerLineSide = $derived(
    lineSideTendency(data.lineSideAllTime.find((r) => r.user_id === selectedUserId))
  );

  // Career situational splits for the selected player, fed to the "Your edge" panel (#502).
  const selectedSituational = $derived(
    data.situational.filter((r) => r.user_id === selectedUserId)
  );
  // Season situational splits for the selected player (#514) — the explorer's season lens.
  const selectedSituationalSeason = $derived(
    data.situationalSeason.filter((r) => r.user_id === selectedUserId)
  );
  // Explorer layouts per scope: every bucket of each dimension vs the matching league line (#514).
  const careerExplorer = $derived(
    situationalExplorer(selectedSituational, data.leagueSituationalBaseline)
  );
  const seasonExplorer = $derived(
    situationalExplorer(selectedSituationalSeason, data.leagueSituationalBaselineSeason)
  );

  // Team book (#564): the selected player's two-sided (ride/fade) records, season + career. The
  // raw rows gate the "Team book" breakdown chip; teamBookStandouts reduces them to the standouts
  // shown, and also feeds the signature strip's most-notable ride/fade tell.
  const seasonTeamBookRows = $derived(data.teamBook.filter((r) => r.user_id === selectedUserId));
  const careerTeamBookRows = $derived(
    data.teamBookAllTime.filter((r) => r.user_id === selectedUserId)
  );
  const seasonTeamBook = $derived(teamBookStandouts(seasonTeamBookRows));
  const careerTeamBook = $derived(teamBookStandouts(careerTeamBookRows));

  // Signature tendencies (#564): the plain-language strip, career-first and scope-aware. It ranks
  // the strongest already-computed cuts — situational edges, the fav/dog lean, and the team book —
  // for the current scope. The career strip leads with career samples; the season strip re-scopes.
  const careerSignature = $derived(
    signatureTendencies({
      edges: situationalEdges(selectedSituational, data.leagueSituationalBaseline),
      lineSide: careerLineSide,
      teamBook: careerTeamBook
    })
  );
  const seasonSignature = $derived(
    signatureTendencies({
      edges: situationalEdges(selectedSituationalSeason, data.leagueSituationalBaselineSeason),
      lineSide,
      teamBook: seasonTeamBook
    })
  );

  const trendRows = $derived(data.trend.filter((r) => r.user_id === selectedUserId));
  const weightRows = $derived(
    data.weightAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))
  );

  // Normalized rows for the shared meter list.
  const weightAccuracyRows = $derived(
    weightRows.map((r) => ({
      key: r.weight,
      label: weightLabel(r.weight),
      isAllIn: r.weight === 'A',
      wins: r.wins,
      losses: r.losses,
      pushes: r.pushes,
      accuracy: r.accuracy,
      points: r.points
    }))
  );

  const seasonH2H = $derived(
    selectedUserId ? headToHeadForUser(data.headToHead, selectedUserId) : []
  );
  const seasonBreakdownOptions = $derived(
    breakdownOptions(
      seasonTeamBookRows.length > 0,
      weightAccuracyRows.length > 0,
      trendRows.length > 0,
      seasonH2H.length > 0
    )
  );
  const activeSeasonBreakdown = $derived(
    activeBreakdown(seasonBreakdownCut, seasonBreakdownOptions)
  );

  // All-time row derivations (allTimeWeightRows / careerH2H) live inside the
  // {#await data.allTimeDetail} block below, since that data streams in asynchronously.
</script>

{#snippet loadingState()}
  <!-- Cache miss (no SSR initialData, nothing cached yet): show a skeleton while the
       query loads, rather than the empty-state card. -->
  <div class="space-y-6" aria-hidden="true">
    <div class="h-12 w-full animate-pulse rounded-xl bg-muted"></div>
    <div class="h-40 w-full animate-pulse rounded-xl bg-muted"></div>
    <div class="h-48 w-full animate-pulse rounded-xl bg-muted"></div>
  </div>
{/snippet}

{#snippet errorState(retry: () => void)}
  <!-- Hard failure only (error with no cached data). A background-refetch failure that still has
       last-good data keeps rendering the stats + context bar; the shell stale pill flags it
       (audit S5). Retry refetches this query rather than telling the user to reload the page. -->
  <Card class="border-dashed">
    <CardHeader>
      <CardTitle>Couldn't load stats</CardTitle>
      <CardDescription>Something went wrong fetching your stats.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="outline" size="sm" onclick={retry}>Retry</Button>
    </CardContent>
  </Card>
{/snippet}

{#snippet wlp(wins: number, losses: number, pushes: number)}
  <span class="tabular-nums">{wins}-{losses}-{pushes}</span>
{/snippet}

{#snippet h2hGrid(rows: ReturnType<typeof headToHeadForUser>, span: string)}
  <p class="mb-3 text-sm text-muted-foreground">
    {possessive} weighted results against each player on games where you picked opposite sides {span}.
  </p>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#each rows as row (row.opponentUserId)}
      <Card class="gap-3 py-4">
        <CardHeader class="px-4">
          <CardTitle class="text-base">
            {subjectLabel} <span class="text-muted-foreground">vs</span>
            {row.opponentDisplayName}
          </CardTitle>
          <CardDescription>{row.gamesCompared} games you disagreed on</CardDescription>
        </CardHeader>
        <CardContent class="flex items-end justify-between px-4">
          <div>
            <p class="text-2xl font-bold">{@render wlp(row.wins, row.losses, row.pushes)}</p>
            <p class="text-xs text-muted-foreground">wins-losses-pushes</p>
          </div>
          <p class="text-sm font-medium">{row.points} to {row.opponentPoints} pts</p>
        </CardContent>
      </Card>
    {/each}
  </div>
{/snippet}

<svelte:head>
  <title>Stats | Hotshot</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="stats-heading">
  <div>
    <h1 id="stats-heading" class="text-3xl font-bold tracking-tight">Stats & history</h1>
    <p class="mt-1 text-muted-foreground">How you've performed against the spread.</p>
  </div>

  {#if statsQuery.isPending}
    {@render loadingState()}
  {:else if statsQuery.isError && !statsQuery.data}
    {@render errorState(() => statsQuery.refetch())}
  {:else if data.allTimeTotals.length === 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No settled picks yet</CardTitle>
        <CardDescription>
          Your season summary and records will appear after the first games are graded.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    <!-- Scope line: the one context bar (#518) — player + season/scope — is the first element
         below the page title and governs the whole scoped stack beneath it: hero, explorer, and
         breakdowns (#567). No card floats above it; Career and season both lead with the hero.
         Sticky under the app header so the picker never scrolls away; the season selector absorbs
         Career as a pinned option, so scope is one control that scales as seasons accumulate. -->
    <div
      data-testid="stats-context-bar"
      class="sticky top-14 z-30 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      {#if orderedPlayersForPicker.length > 1}
        <select
          class={SELECT_CLASS}
          value={selectedUserId ?? ''}
          onchange={onPlayerChange}
          aria-label="Select a player"
        >
          {#each orderedPlayersForPicker as player (player.user_id)}
            <option value={player.user_id}>
              {player.user_id === data.currentUserId ? 'You' : player.display_name}
            </option>
          {/each}
        </select>
      {:else}
        <span class="px-1 text-sm font-medium">{subjectLabel}</span>
      {/if}

      <select
        class="{SELECT_CLASS} ml-auto"
        value={scopeValue}
        onchange={onScopeChange}
        aria-label="Select season or career"
      >
        {#if scopeOptions.latest !== null}
          <option value={String(scopeOptions.latest)}>This season · {scopeOptions.latest}</option>
        {/if}
        <option value="career">Career</option>
        {#if scopeOptions.pastSeasons.length > 0}
          <optgroup label="Past seasons">
            {#each scopeOptions.pastSeasons as year (year)}
              <option value={String(year)}>{year}</option>
            {/each}
          </optgroup>
        {/if}
      </select>
    </div>

    {#if selectedCareer}
      {#if scope === 'career'}
        <!-- One scope-aware hero leads the scoped content (#567): the all-time number line
             (Record · ATS% · Decisions) paired with the career-first signature tells. -->
        <StatsHero
          isYou={isSelectedYou}
          displayName={selectedDisplayName}
          scopeLabel="Career"
          wins={selectedCareer.wins}
          losses={selectedCareer.losses}
          pushes={selectedCareer.pushes}
          missed={selectedCareer.missed}
          atsAccuracy={careerAtsAccuracy}
          decisions={selectedCareer.decisions}
          tells={careerSignature}
        />

        <!-- Every split (#514): browse every ATS cut across the career, one dimension at a time. -->
        <SituationalExplorer
          dimensions={careerExplorer}
          scopeLabel="Career"
          isYou={isSelectedYou}
          displayName={selectedDisplayName}
          value={explorerCut}
          onchange={(dimension) => (explorerCut = dimension)}
        />

        <!-- Team/weight/H2H tables share the same one-tap chip selector as Every split (#538),
             streamed off the critical path. -->
        {#await data.allTimeDetail}
          <Card class="border-dashed">
            <CardHeader>
              <CardTitle>Loading all-time accuracy…</CardTitle>
              <CardDescription>One moment while the career breakdowns load.</CardDescription>
            </CardHeader>
          </Card>
        {:then detail}
          {@const allTimeWeightRows = detail.allTimeWeightAccuracy
            .filter((r) => r.user_id === selectedUserId)
            .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))}
          {@const allTimeWeightAccuracyRows = allTimeWeightRows.map((r) => ({
            key: r.weight,
            label: weightLabel(r.weight),
            isAllIn: r.weight === 'A',
            wins: r.wins,
            losses: r.losses,
            pushes: r.pushes,
            accuracy: r.accuracy,
            points: r.points
          }))}
          {@const careerH2H = selectedUserId
            ? headToHeadForUser(detail.allTimeHeadToHead, selectedUserId)
            : []}
          {@const careerBreakdownOptions = breakdownOptions(
            careerTeamBookRows.length > 0,
            allTimeWeightAccuracyRows.length > 0,
            false,
            careerH2H.length > 0
          )}
          {@const activeCareerBreakdown = activeBreakdown(
            careerBreakdownCut,
            careerBreakdownOptions
          )}
          {#if careerTeamBookRows.length > 0 || allTimeWeightAccuracyRows.length > 0 || careerH2H.length > 0}
            <Card data-testid="stats-breakdowns">
              <CardHeader>
                <CardTitle>Breakdowns</CardTitle>
                <CardDescription>Career results from one cut at a time.</CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <ChipRadiogroup
                  options={careerBreakdownOptions}
                  value={activeCareerBreakdown ?? ''}
                  ariaLabel="Career breakdown"
                  idPrefix="career-breakdown"
                  onchange={(value) => (careerBreakdownCut = value as BreakdownCut)}
                />

                <div
                  role="region"
                  aria-label="{careerBreakdownOptions.find(
                    (option) => option.value === activeCareerBreakdown
                  )?.label} breakdown"
                  data-testid="stats-breakdown-panel"
                >
                  {#if activeCareerBreakdown === 'team'}
                    <p class="mb-3 text-sm text-muted-foreground">
                      All-time standouts — the teams {isSelectedYou ? 'you' : selectedDisplayName} most
                      ride and most fade.
                    </p>
                    <TeamBook
                      standouts={careerTeamBook}
                      isYou={isSelectedYou}
                      displayName={selectedDisplayName}
                    />
                  {:else if activeCareerBreakdown === 'weight'}
                    <p class="mb-3 text-sm text-muted-foreground">
                      All-time confidence-level results, including each All-In.
                    </p>
                    <StatAccuracyList rows={allTimeWeightAccuracyRows} />
                  {:else if activeCareerBreakdown === 'h2h'}
                    {@render h2hGrid(careerH2H, 'all-time')}
                  {/if}
                </div>
              </CardContent>
            </Card>
          {/if}
        {:catch}
          <!-- The career detail is a streamed (un-awaited) promise from the server load; on
               rejection it used to leave a permanent fake "Loading…" card (audit S5). Show a real
               error state instead. It's not a `createQuery`, so retry re-runs the page load
               (`invalidateAll`) to build a fresh promise. -->
          <Card class="border-dashed" data-testid="stats-alltime-detail-error">
            <CardHeader>
              <CardTitle>Couldn't load all-time accuracy</CardTitle>
              <CardDescription>The career breakdowns didn't load.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onclick={() => void invalidateAll()}>Retry</Button
              >
            </CardContent>
          </Card>
        {/await}
      {:else}
        <!-- Season: the same scope-aware hero, re-scoped to the selected season, then the
             season-scoped explorer (#567). Both halves of the hero follow the dropdown. -->
        {#if data.totals.length === 0}
          <Card class="border-dashed">
            <CardHeader>
              <CardTitle>No settled picks for {data.seasonYear}</CardTitle>
              <CardDescription>Pick another season or Career above.</CardDescription>
            </CardHeader>
          </Card>
        {:else if selected}
          <!-- One scope-aware hero (#567): the season number line paired with the season-scoped
               signature tells. Player + season already live in the context bar above. -->
          <StatsHero
            isYou={isSelectedYou}
            displayName={selectedDisplayName}
            scopeLabel={String(data.seasonYear)}
            wins={selected.wins}
            losses={selected.losses}
            pushes={selected.pushes}
            missed={selected.missed}
            {atsAccuracy}
            decisions={selected.decisions}
            tells={seasonSignature}
          />

          <!-- Every split (#514): the season-scoped situational explorer. -->
          <SituationalExplorer
            dimensions={seasonExplorer}
            scopeLabel={String(data.seasonYear)}
            isYou={isSelectedYou}
            displayName={selectedDisplayName}
            value={explorerCut}
            onchange={(dimension) => (explorerCut = dimension)}
          />

          <!-- Team/weight/trend/H2H tables share the same one-tap chip selector as Every split
               (#538). -->
          {#if seasonTeamBookRows.length > 0 || weightAccuracyRows.length > 0 || trendRows.length > 0 || seasonH2H.length > 0}
            <Card data-testid="stats-breakdowns">
              <CardHeader>
                <CardTitle>Breakdowns</CardTitle>
                <CardDescription>{data.seasonYear} results from one cut at a time.</CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <ChipRadiogroup
                  options={seasonBreakdownOptions}
                  value={activeSeasonBreakdown ?? ''}
                  ariaLabel="Season breakdown"
                  idPrefix="season-breakdown"
                  onchange={(value) => (seasonBreakdownCut = value as BreakdownCut)}
                />

                <div
                  role="region"
                  aria-label="{seasonBreakdownOptions.find(
                    (option) => option.value === activeSeasonBreakdown
                  )?.label} breakdown"
                  data-testid="stats-breakdown-panel"
                >
                  {#if activeSeasonBreakdown === 'team'}
                    <p class="mb-3 text-sm text-muted-foreground">
                      {possessive}
                      {data.seasonYear} standouts — the teams {isSelectedYou
                        ? 'you'
                        : selectedDisplayName} most ride and most fade.
                    </p>
                    <TeamBook
                      standouts={seasonTeamBook}
                      isYou={isSelectedYou}
                      displayName={selectedDisplayName}
                    />
                  {:else if activeSeasonBreakdown === 'weight'}
                    <p class="mb-3 text-sm text-muted-foreground">
                      {possessive}
                      {data.seasonYear} confidence-level results, including each All-In.
                    </p>
                    <StatAccuracyList rows={weightAccuracyRows} />
                  {:else if activeSeasonBreakdown === 'trend'}
                    <p class="mb-3 text-sm text-muted-foreground">
                      {possessive} cumulative points after each completed week.
                    </p>
                    <SeasonTrendChart rows={trendRows} showLegend={false} />
                  {:else if activeSeasonBreakdown === 'h2h'}
                    {@render h2hGrid(seasonH2H, 'this season')}
                  {/if}
                </div>
              </CardContent>
            </Card>
          {/if}
        {:else}
          <Card class="border-dashed">
            <CardHeader>
              <CardTitle>No settled picks for {emptyStateSubject} in {data.seasonYear}</CardTitle>
              <CardDescription>Pick another player or season above.</CardDescription>
            </CardHeader>
          </Card>
        {/if}
      {/if}
    {/if}
  {/if}
</section>
