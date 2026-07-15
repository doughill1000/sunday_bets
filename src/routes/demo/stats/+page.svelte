<script lang="ts">
  // Demo Stats (#460, ADR-0026 — extended #669): the real Stats surfaces — StatsHero,
  // SituationalExplorer, and the team/weight/trend/H2H Breakdowns card — reading the frozen
  // `stats` payload directly rather than a `createQuery`. Single-scope by design (#669's stated
  // default): the completed season only, the persona as the only subject — the real page's
  // player picker and Season/Career toggle don't apply to a one-persona, one-season snapshot.
  import type { PageData } from './$types';
  import type { SituationalDimension } from '$lib/types/server/stats';
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
  import {
    headToHeadForUser,
    lineSideTendency,
    signatureTendencies,
    situationalEdges,
    situationalExplorer,
    teamBookStandouts
  } from '$lib/utils/stats';
  import { weightLabel } from '$lib/domain/scoring';

  let { data }: { data: PageData } = $props();

  const WEIGHT_ORDER = ['L', 'M', 'H', 'A'];
  const userId = $derived(data.persona.userId);

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

  let breakdownCut = $state<BreakdownCut>('team');
  let explorerCut = $state<SituationalDimension | null>(null);

  const selected = $derived(data.stats.totals.find((t) => t.user_id === userId) ?? null);
  const atsAccuracy = $derived.by(() => {
    if (!selected) return null;
    const decided = selected.wins + selected.losses;
    return decided > 0 ? selected.wins / decided : null;
  });

  const lineSide = $derived(
    lineSideTendency(data.stats.lineSide.find((r) => r.user_id === userId))
  );
  const situational = $derived(data.stats.situationalSeason.filter((r) => r.user_id === userId));
  const explorerDimensions = $derived(
    situationalExplorer(situational, data.stats.leagueSituationalBaselineSeason)
  );

  const teamBookRows = $derived(data.stats.teamBook.filter((r) => r.user_id === userId));
  const teamBook = $derived(teamBookStandouts(teamBookRows));

  const signature = $derived(
    signatureTendencies({
      edges: situationalEdges(situational, data.stats.leagueSituationalBaselineSeason),
      lineSide,
      teamBook
    })
  );

  const trendRows = $derived(data.stats.trend.filter((r) => r.user_id === userId));
  const weightRows = $derived(
    data.stats.weightAccuracy
      .filter((r) => r.user_id === userId)
      .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))
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

  const h2h = $derived(headToHeadForUser(data.stats.headToHead, userId));
  const options = $derived(
    breakdownOptions(
      teamBookRows.length > 0,
      weightAccuracyRows.length > 0,
      trendRows.length > 0,
      h2h.length > 0
    )
  );
  const activeCut = $derived(activeBreakdown(breakdownCut, options));
</script>

{#snippet wlp(wins: number, losses: number, pushes: number)}
  <span class="tabular-nums">{wins}-{losses}-{pushes}</span>
{/snippet}

<svelte:head>
  <title>Stats | Hotshot Demo</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-stats-heading">
  <div>
    <h1 id="demo-stats-heading" class="text-3xl font-bold tracking-tight">Stats & history</h1>
    <p class="mt-1 text-muted-foreground">
      How {data.persona.displayName} performed against the spread.
    </p>
  </div>

  {#if selected}
    <StatsHero
      isYou
      displayName={data.persona.displayName}
      scopeLabel={String(data.seasonYear)}
      wins={selected.wins}
      losses={selected.losses}
      pushes={selected.pushes}
      missed={selected.missed}
      {atsAccuracy}
      decisions={selected.decisions}
      tells={signature}
    />

    <SituationalExplorer
      dimensions={explorerDimensions}
      scopeLabel={String(data.seasonYear)}
      isYou
      displayName={data.persona.displayName}
      value={explorerCut}
      onchange={(dimension) => (explorerCut = dimension)}
    />

    {#if teamBookRows.length > 0 || weightAccuracyRows.length > 0 || trendRows.length > 0 || h2h.length > 0}
      <Card data-testid="stats-breakdowns">
        <CardHeader>
          <CardTitle>Breakdowns</CardTitle>
          <CardDescription>{data.seasonYear} results from one cut at a time.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <ChipRadiogroup
            {options}
            value={activeCut ?? ''}
            ariaLabel="Season breakdown"
            idPrefix="demo-stats-breakdown"
            onchange={(value) => (breakdownCut = value as BreakdownCut)}
          />

          <div
            role="region"
            aria-label="{options.find((option) => option.value === activeCut)?.label} breakdown"
            data-testid="stats-breakdown-panel"
          >
            {#if activeCut === 'team'}
              <p class="mb-3 text-sm text-muted-foreground">
                {data.persona.displayName}'s {data.seasonYear} standouts — the teams ridden and faded
                most.
              </p>
              <TeamBook standouts={teamBook} isYou displayName={data.persona.displayName} />
            {:else if activeCut === 'weight'}
              <p class="mb-3 text-sm text-muted-foreground">
                {data.seasonYear} confidence-level results, including the All-In.
              </p>
              <StatAccuracyList rows={weightAccuracyRows} />
            {:else if activeCut === 'trend'}
              <p class="mb-3 text-sm text-muted-foreground">
                Cumulative points after each completed week.
              </p>
              <SeasonTrendChart rows={trendRows} showLegend={false} />
            {:else if activeCut === 'h2h'}
              <p class="mb-3 text-sm text-muted-foreground">
                Weighted results against each player on games they picked opposite sides this
                season.
              </p>
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {#each h2h as row (row.opponentUserId)}
                  <Card class="gap-3 py-4">
                    <CardHeader class="px-4">
                      <CardTitle class="text-base">
                        {data.persona.displayName} <span class="text-muted-foreground">vs</span>
                        {row.opponentDisplayName}
                      </CardTitle>
                      <CardDescription>{row.gamesCompared} games disagreed on</CardDescription>
                    </CardHeader>
                    <CardContent class="flex items-end justify-between px-4">
                      <div>
                        <p class="text-2xl font-bold">
                          {@render wlp(row.wins, row.losses, row.pushes)}
                        </p>
                        <p class="text-xs text-muted-foreground">wins-losses-pushes</p>
                      </div>
                      <p class="text-sm font-medium">{row.points} to {row.opponentPoints} pts</p>
                    </CardContent>
                  </Card>
                {/each}
              </div>
            {/if}
          </div>
        </CardContent>
      </Card>
    {/if}
  {:else}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No settled picks for {data.seasonYear}</CardTitle>
      </CardHeader>
    </Card>
  {/if}
</section>
