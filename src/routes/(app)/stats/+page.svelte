<script lang="ts">
  import { goto } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchStats } from '$lib/query/fetchers';
  import type { StatsCachePayload } from '$lib/query/types';
  import type { PageData } from './$types';
  import CareerSummary from '$lib/components/stats/CareerSummary.svelte';
  import SeasonTrendChart from '$lib/components/stats/SeasonTrendChart.svelte';
  import YourEdge from '$lib/components/stats/YourEdge.svelte';
  import StatAccuracyList from '$lib/components/stats/StatAccuracyList.svelte';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
  } from '$lib/components/ui/accordion';
  import {
    consensusTendency,
    formatAccuracy,
    headToHeadForUser,
    lineSideTendency,
    seasonScopeOptions,
    streakTendency
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
    initialData: pageData.initialStats
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
    leagueSituationalBaseline: []
  };

  // `pageData` is spread last so its (reactive) season metadata wins for shared keys; the
  // cached/empty payload supplies totals / accuracy / head-to-head.
  const data = $derived({ ...(statsQuery.data ?? EMPTY_STATS), ...pageData });

  // Light → All-In, so the highlighted All-In row sorts last.
  const WEIGHT_ORDER = ['L', 'M', 'H', 'A'];

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
  const scopeOptions = $derived(seasonScopeOptions(data.availableSeasons));
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
  const isCareerYou = $derived(selectedUserId === data.currentUserId);
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

  // Previously-latent personal cuts (#502): favorite/underdog lean, win streak, and consensus
  // behavior for the selected player + season. Each is sample-guarded, so it renders as a compact
  // tile only when there are enough placed picks to be meaningful.
  const lineSide = $derived(
    lineSideTendency(data.lineSide.find((r) => r.user_id === selectedUserId))
  );
  const streak = $derived(streakTendency(data.streaks.find((r) => r.user_id === selectedUserId)));
  const consensus = $derived(
    consensusTendency(data.consensusStats.find((r) => r.user_id === selectedUserId))
  );
  const hasTendencies = $derived(Boolean(lineSide || streak || consensus));

  // Career situational splits for the selected player, fed to the "Your edge" panel (#502).
  const selectedSituational = $derived(
    data.situational.filter((r) => r.user_id === selectedUserId)
  );

  // Nulls sort last regardless; otherwise highest cover first.
  function compareCoverDesc(a: number | null, b: number | null) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return b - a;
  }

  const trendRows = $derived(data.trend.filter((r) => r.user_id === selectedUserId));
  const teamRows = $derived(
    data.teamAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted(
        (a, b) =>
          compareCoverDesc(a.accuracy, b.accuracy) ||
          b.decisions - a.decisions ||
          a.team_short_name.localeCompare(b.team_short_name)
      )
  );
  const weightRows = $derived(
    data.weightAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))
  );

  // Normalized rows for the shared meter list.
  const teamAccuracyRows = $derived(
    teamRows.map((r) => ({
      key: r.team_id,
      label: r.team_short_name,
      title: r.team_name,
      wins: r.wins,
      losses: r.losses,
      pushes: r.pushes,
      accuracy: r.accuracy,
      points: r.points
    }))
  );
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

  // Cheap glances for the collapsed disclosure rows, so a section reads without opening it.
  const teamMeta = $derived(
    teamAccuracyRows.length > 0
      ? `${teamAccuracyRows[0].label} ${formatAccuracy(teamAccuracyRows[0].accuracy)}`
      : ''
  );
  const weightMeta = $derived.by(() => {
    const allIn = weightRows.find((r) => r.weight === 'A');
    return allIn ? `All-In ${allIn.wins}-${allIn.losses}-${allIn.pushes}` : '';
  });
  const trendMeta = $derived.by(() => {
    const last = trendRows.at(-1);
    if (!last) return '';
    return `${last.cumulative_points >= 0 ? '+' : ''}${last.cumulative_points} pts`;
  });

  function rivalMeta(n: number) {
    return `${n} rival${n === 1 ? '' : 's'}`;
  }

  // All-time row derivations (allTimeTeamRows / allTimeWeightRows / careerH2H) live inside the
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

{#snippet errorState()}
  <Card class="border-dashed">
    <CardHeader>
      <CardTitle>Couldn't load stats</CardTitle>
      <CardDescription>
        Something went wrong fetching your stats. Refresh the page to try again.
      </CardDescription>
    </CardHeader>
  </Card>
{/snippet}

{#snippet wlp(wins: number, losses: number, pushes: number)}
  <span class="tabular-nums text-white">{wins}-{losses}-{pushes}</span>
{/snippet}

{#snippet discTrigger(title: string, meta: string)}
  <span class="flex w-full items-center justify-between gap-3">
    <span>{title}</span>
    {#if meta}
      <span class="text-xs font-normal tabular-nums text-muted-foreground">{meta}</span>
    {/if}
  </span>
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
  {:else if statsQuery.isError}
    {@render errorState()}
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
    <!-- One context bar (#518): player + season/scope, sticky under the app header so the
         picker never scrolls away. The season selector stays a dropdown and absorbs Career as
         a pinned option, so scope is one control that scales as seasons accumulate. -->
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
        <!-- Career leads with the headline all-time totals, then the edge synthesis (#518). -->
        <CareerSummary entry={selectedCareer} isYou={isCareerYou} dropActive={data.dropActive} />

        <!-- Synthesis (#502): where the selected player beats or trails the market, all-time. -->
        <YourEdge
          splits={selectedSituational}
          baseline={data.leagueSituationalBaseline}
          isYou={isSelectedYou}
          displayName={selectedDisplayName}
        />

        <!-- All-time accuracy breakdowns (streamed off the critical path) -->
        {#await data.allTimeDetail}
          <Card class="border-dashed">
            <CardHeader>
              <CardTitle>Loading all-time accuracy…</CardTitle>
              <CardDescription>One moment while the career breakdowns load.</CardDescription>
            </CardHeader>
          </Card>
        {:then detail}
          {@const allTimeTeamRows = detail.allTimeTeamAccuracy
            .filter((r) => r.user_id === selectedUserId)
            .toSorted(
              (a, b) =>
                compareCoverDesc(a.accuracy, b.accuracy) ||
                b.decisions - a.decisions ||
                a.team_short_name.localeCompare(b.team_short_name)
            )}
          {@const allTimeWeightRows = detail.allTimeWeightAccuracy
            .filter((r) => r.user_id === selectedUserId)
            .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))}
          {@const allTimeTeamAccuracyRows = allTimeTeamRows.map((r) => ({
            key: r.team_id,
            label: r.team_short_name,
            title: r.team_name,
            wins: r.wins,
            losses: r.losses,
            pushes: r.pushes,
            accuracy: r.accuracy,
            points: r.points
          }))}
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
          {#if allTimeTeamAccuracyRows.length > 0 || allTimeWeightAccuracyRows.length > 0 || careerH2H.length > 0}
            <div class="space-y-2">
              <h2 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                All-time breakdown
              </h2>
              <Accordion type="multiple" class="rounded-xl border">
                {#if allTimeTeamAccuracyRows.length > 0}
                  <AccordionItem value="career-team" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger(
                        'Accuracy by team',
                        `${allTimeTeamAccuracyRows[0].label} ${formatAccuracy(allTimeTeamAccuracyRows[0].accuracy)}`
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p class="mb-3 text-sm text-muted-foreground">
                        All-time results grouped by the team backed.
                      </p>
                      <StatAccuracyList rows={allTimeTeamAccuracyRows} />
                    </AccordionContent>
                  </AccordionItem>
                {/if}

                {#if allTimeWeightAccuracyRows.length > 0}
                  <AccordionItem value="career-weight" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger('Accuracy by weight', '')}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p class="mb-3 text-sm text-muted-foreground">
                        All-time confidence-level results, including each All-In.
                      </p>
                      <StatAccuracyList rows={allTimeWeightAccuracyRows} />
                    </AccordionContent>
                  </AccordionItem>
                {/if}

                {#if careerH2H.length > 0}
                  <AccordionItem value="career-h2h" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger('Head to head', rivalMeta(careerH2H.length))}
                    </AccordionTrigger>
                    <AccordionContent>
                      {@render h2hGrid(careerH2H, 'all-time')}
                    </AccordionContent>
                  </AccordionItem>
                {/if}
              </Accordion>
            </div>
          {/if}
        {/await}
      {:else}
        <!-- Season leads with the all-time edge synthesis, then the season snapshot (#518). -->
        <YourEdge
          splits={selectedSituational}
          baseline={data.leagueSituationalBaseline}
          isYou={isSelectedYou}
          displayName={selectedDisplayName}
        />

        {#if data.totals.length === 0}
          <Card class="border-dashed">
            <CardHeader>
              <CardTitle>No settled picks for {data.seasonYear}</CardTitle>
              <CardDescription>Pick another season or Career above.</CardDescription>
            </CardHeader>
          </Card>
        {:else if selected}
          <!-- Compact season snapshot — the player + season already live in the context bar. -->
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-base font-semibold">
                {subjectLabel} · {data.seasonYear} season
              </CardTitle>
            </CardHeader>
            <CardContent>
              <!-- Analytics only: standings score + rank live on the Leaderboard now (ADR-0018).
                 These tiles describe actual performance, always raw. -->
              <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">Record (W-L-P)</dt>
                  <dd class="text-2xl font-bold">
                    {@render wlp(selected.wins, selected.losses, selected.pushes)}
                  </dd>
                  {#if selected.missed > 0}
                    <p class="text-xs text-muted-foreground">{selected.missed} missed</p>
                  {/if}
                </div>
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">ATS accuracy</dt>
                  <dd class="text-2xl font-bold">{formatAccuracy(atsAccuracy)}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">Decisions</dt>
                  <dd class="text-2xl font-bold">{selected.decisions}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">Missed</dt>
                  <dd class="text-2xl font-bold">{selected.missed}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {#if hasTendencies}
            <Card>
              <CardHeader>
                <CardTitle>Tendencies</CardTitle>
                <CardDescription>
                  How {isSelectedYou ? 'you' : selectedDisplayName} played the board in {data.seasonYear}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {#if lineSide}
                    <div>
                      <dt class="text-xs font-medium text-muted-foreground">
                        Favorite vs underdog
                      </dt>
                      <dd class="mt-1 text-2xl font-bold">
                        {formatAccuracy(lineSide.favoritePct)}
                        <span class="text-sm font-normal text-muted-foreground">favorites</span>
                      </dd>
                      <p class="text-xs text-muted-foreground">
                        {formatAccuracy(lineSide.underdogPct)} underdogs · {lineSide.lean ===
                        'balanced'
                          ? 'balanced mix'
                          : `leans ${lineSide.lean}`}
                      </p>
                    </div>
                  {/if}
                  {#if streak}
                    <div>
                      <dt class="text-xs font-medium text-muted-foreground">Win streak</dt>
                      <dd class="mt-1 text-2xl font-bold tabular-nums">{streak.current}</dd>
                      <p class="text-xs text-muted-foreground">current · best {streak.best}</p>
                    </div>
                  {/if}
                  {#if consensus}
                    <div>
                      <dt class="text-xs font-medium text-muted-foreground">Against the crowd</dt>
                      <dd class="mt-1 text-2xl font-bold">
                        {formatAccuracy(consensus.contrarianPct)}
                      </dd>
                      <p class="text-xs text-muted-foreground">
                        {consensus.contrarianWins}/{consensus.contrarianPicks} contrarian picks won
                      </p>
                    </div>
                  {/if}
                </dl>
              </CardContent>
            </Card>
          {/if}

          <!-- Density pass (#518): the longer tables move behind progressive disclosure so the
             first screen leads with synthesis (edge + snapshot + tendencies). -->
          {#if teamAccuracyRows.length > 0 || weightAccuracyRows.length > 0 || trendRows.length > 0 || seasonH2H.length > 0}
            <div class="space-y-2">
              <h2 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Breakdown
              </h2>
              <Accordion type="multiple" class="rounded-xl border">
                {#if teamAccuracyRows.length > 0}
                  <AccordionItem value="team" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger('Accuracy by team', teamMeta)}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p class="mb-3 text-sm text-muted-foreground">
                        {possessive}
                        {data.seasonYear} results grouped by the team backed.
                      </p>
                      <StatAccuracyList rows={teamAccuracyRows} />
                    </AccordionContent>
                  </AccordionItem>
                {/if}

                {#if weightAccuracyRows.length > 0}
                  <AccordionItem value="weight" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger('Accuracy by weight', weightMeta)}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p class="mb-3 text-sm text-muted-foreground">
                        {possessive}
                        {data.seasonYear} confidence-level results, including each All-In.
                      </p>
                      <StatAccuracyList rows={weightAccuracyRows} />
                    </AccordionContent>
                  </AccordionItem>
                {/if}

                {#if trendRows.length > 0}
                  <AccordionItem value="trend" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger('Season trend', trendMeta)}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p class="mb-3 text-sm text-muted-foreground">
                        {possessive} cumulative points after each completed week.
                      </p>
                      <SeasonTrendChart rows={trendRows} showLegend={false} />
                    </AccordionContent>
                  </AccordionItem>
                {/if}

                {#if seasonH2H.length > 0}
                  <AccordionItem value="h2h" class="px-4">
                    <AccordionTrigger>
                      {@render discTrigger('Head to head', rivalMeta(seasonH2H.length))}
                    </AccordionTrigger>
                    <AccordionContent>
                      {@render h2hGrid(seasonH2H, 'this season')}
                    </AccordionContent>
                  </AccordionItem>
                {/if}
              </Accordion>
            </div>
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
