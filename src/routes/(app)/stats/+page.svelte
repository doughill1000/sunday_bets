<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import CareerSummary from '$lib/components/stats/CareerSummary.svelte';
  import LeagueHonors from '$lib/components/stats/LeagueHonors.svelte';
  import SeasonTrendChart from '$lib/components/stats/SeasonTrendChart.svelte';
  import SortableTableHead from '$lib/components/table/SortableTableHead.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { formatAccuracy, headToHeadForUser } from '$lib/utils/stats';
  import { weightLabel } from '$lib/domain/scoring';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';

  let { data }: { data: PageData } = $props();

  type TeamSortKey = 'team' | 'record' | 'accuracy' | 'points';
  type SortDirection = 'asc' | 'desc';

  // Light → All-In, so the highlighted All-In row sorts last.
  const WEIGHT_ORDER = ['L', 'M', 'H', 'A'];
  const DEFAULT_SORT_DIRECTION: Record<TeamSortKey, SortDirection> = {
    team: 'asc',
    record: 'desc',
    accuracy: 'desc',
    points: 'desc'
  };
  const SHOW_HEAD_TO_HEAD = false;

  let teamSort = $state<{ key: TeamSortKey; direction: SortDirection }>({
    key: 'accuracy',
    direction: 'desc'
  });

  let allTimeTeamSort = $state<{ key: TeamSortKey; direction: SortDirection }>({
    key: 'accuracy',
    direction: 'desc'
  });

  const orderedPlayersForPicker = $derived.by(() => {
    const you = data.allTimeTotals.find((t) => t.user_id === data.currentUserId);
    const others = data.allTimeTotals.filter((t) => t.user_id !== data.currentUserId);
    return you ? [you, ...others] : data.allTimeTotals;
  });

  let selectedUserId = $state<string | null>(
    data.allTimeTotals.some((t) => t.user_id === data.currentUserId)
      ? data.currentUserId
      : (data.allTimeTotals[0]?.user_id ?? null)
  );
  let selectedSeasonYear = $derived(String(data.seasonYear));

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

  function setTeamSort(key: TeamSortKey) {
    teamSort =
      teamSort.key === key
        ? { key, direction: teamSort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DEFAULT_SORT_DIRECTION[key] };
  }

  function setAllTimeTeamSort(key: TeamSortKey) {
    allTimeTeamSort =
      allTimeTeamSort.key === key
        ? { key, direction: allTimeTeamSort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DEFAULT_SORT_DIRECTION[key] };
  }

  function compareNumber(a: number | null, b: number | null, direction: SortDirection) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return direction === 'asc' ? a - b : b - a;
  }

  function compareRecord(
    a: { wins: number; losses: number; pushes: number },
    b: { wins: number; losses: number; pushes: number },
    direction: SortDirection
  ) {
    const multiplier = direction === 'asc' ? 1 : -1;
    return (
      multiplier * (a.wins - b.wins) ||
      -multiplier * (a.losses - b.losses) ||
      multiplier * (a.pushes - b.pushes)
    );
  }

  function compareTeamRows(
    a: (typeof data.teamAccuracy)[number],
    b: (typeof data.teamAccuracy)[number]
  ) {
    const direction = teamSort.direction;
    const fallback = a.team_short_name.localeCompare(b.team_short_name);

    switch (teamSort.key) {
      case 'team':
        return direction === 'asc' ? fallback : -fallback;
      case 'record':
        return compareRecord(a, b, direction) || fallback;
      case 'accuracy':
        return (
          compareNumber(a.accuracy, b.accuracy, direction) ||
          compareNumber(a.decisions, b.decisions, 'desc') ||
          fallback
        );
      case 'points':
        return compareNumber(a.points, b.points, direction) || fallback;
    }
  }

  function compareAllTimeTeamRows(
    a: (typeof data.allTimeTeamAccuracy)[number],
    b: (typeof data.allTimeTeamAccuracy)[number]
  ) {
    const direction = allTimeTeamSort.direction;
    const fallback = a.team_short_name.localeCompare(b.team_short_name);

    switch (allTimeTeamSort.key) {
      case 'team':
        return direction === 'asc' ? fallback : -fallback;
      case 'record':
        return compareRecord(a, b, direction) || fallback;
      case 'accuracy':
        return (
          compareNumber(a.accuracy, b.accuracy, direction) ||
          compareNumber(a.decisions, b.decisions, 'desc') ||
          fallback
        );
      case 'points':
        return compareNumber(a.points, b.points, direction) || fallback;
    }
  }

  const trendRows = $derived(data.trend.filter((r) => r.user_id === selectedUserId));
  const teamRows = $derived(
    data.teamAccuracy.filter((r) => r.user_id === selectedUserId).toSorted(compareTeamRows)
  );
  const weightRows = $derived(
    data.weightAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))
  );
  const headToHead = $derived(
    selectedUserId ? headToHeadForUser(data.headToHead, selectedUserId) : []
  );
  const allTimeTeamRows = $derived(
    data.allTimeTeamAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted(compareAllTimeTeamRows)
  );
  const allTimeWeightRows = $derived(
    data.allTimeWeightAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))
  );

  function onSeasonChange(e: Event) {
    const year = (e.target as HTMLSelectElement).value;
    selectedSeasonYear = year;
    const url = new URL(window.location.href);
    url.searchParams.set('season', year);
    void goto(url.toString(), { invalidateAll: true });
  }
</script>

{#snippet wlp(wins: number, losses: number, pushes: number)}
  <span class="tabular-nums text-white">{wins}-{losses}-{pushes}</span>
{/snippet}

{#snippet teamHead(label: string, key: TeamSortKey, align: 'left' | 'right' = 'left')}
  <SortableTableHead
    {label}
    {align}
    direction={teamSort.key === key ? teamSort.direction : null}
    onsort={() => setTeamSort(key)}
  />
{/snippet}

{#snippet allTimeTeamHead(label: string, key: TeamSortKey, align: 'left' | 'right' = 'left')}
  <SortableTableHead
    {label}
    {align}
    direction={allTimeTeamSort.key === key ? allTimeTeamSort.direction : null}
    onsort={() => setAllTimeTeamSort(key)}
  />
{/snippet}

<svelte:head>
  <title>Stats | Sunday Bets</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="stats-heading">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 id="stats-heading" class="text-3xl font-bold tracking-tight">Stats & history</h1>
      <p class="mt-1 text-muted-foreground">How you've performed against the spread.</p>
    </div>
  </div>

  <LeagueHonors honors={data.honors} currentUserId={data.currentUserId} />

  {#if data.allTimeTotals.length === 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No settled picks yet</CardTitle>
        <CardDescription>
          Your season summary and records will appear after the first games are graded.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    <!-- Player selector -->
    <div class="flex flex-wrap gap-2" aria-label="Select a player">
      {#each orderedPlayersForPicker as player (player.user_id)}
        {@const isYou = player.user_id === data.currentUserId}
        <Button
          aria-pressed={player.user_id === selectedUserId}
          variant={player.user_id === selectedUserId ? 'default' : 'outline'}
          size="sm"
          onclick={() => (selectedUserId = player.user_id)}
        >
          {isYou ? 'You' : player.display_name}
        </Button>
      {/each}
    </div>

    {#if selectedCareer}
      <Tabs value="season" class="w-full space-y-6">
        <TabsList
          class={SHOW_HEAD_TO_HEAD
            ? 'grid w-full grid-cols-3 sm:inline-grid sm:w-auto'
            : 'grid w-full grid-cols-2 sm:inline-grid sm:w-auto'}
        >
          <TabsTrigger value="season" class={ACTIVE_TAB_TRIGGER_CLASS}>Season</TabsTrigger>
          <TabsTrigger value="career" class={ACTIVE_TAB_TRIGGER_CLASS}>Career</TabsTrigger>
          {#if SHOW_HEAD_TO_HEAD}
            <TabsTrigger value="head-to-head" class={ACTIVE_TAB_TRIGGER_CLASS}
              >Head to head</TabsTrigger
            >
          {/if}
        </TabsList>

        <TabsContent value="season" class="space-y-6">
          <!-- Season picker + per-season heading -->
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-xl font-semibold tracking-tight">Season breakdown</h2>
            {#if data.availableSeasons.length > 1}
              <select
                class="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                bind:value={selectedSeasonYear}
                onchange={onSeasonChange}
                aria-label="Select season"
              >
                {#each data.availableSeasons as year (year)}
                  <option value={String(year)}>{year}</option>
                {/each}
              </select>
            {:else}
              <span class="text-sm text-muted-foreground">{data.seasonYear} season</span>
            {/if}
          </div>

          {#if data.totals.length === 0}
            <Card class="border-dashed">
              <CardHeader>
                <CardTitle>No settled picks for {data.seasonYear}</CardTitle>
                <CardDescription>Select a different season above.</CardDescription>
              </CardHeader>
            </Card>
          {:else if selected}
            <!-- Per-season summary -->
            <Card>
              <CardHeader>
                <CardDescription>{data.seasonYear} season</CardDescription>
                <CardTitle class="text-2xl">{subjectLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <dt class="text-xs font-medium text-muted-foreground">Rank</dt>
                    <dd class="text-2xl font-bold">
                      #{selected.rank}
                      <span class="text-base font-normal text-muted-foreground"
                        >of {data.totals.length}</span
                      >
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs font-medium text-muted-foreground">Points</dt>
                    <dd class="text-2xl font-bold">{selected.total_points}</dd>
                  </div>
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
                </dl>
              </CardContent>
            </Card>

            {#if trendRows.length > 0}
              <Card>
                <CardHeader>
                  <CardTitle>Season trend</CardTitle>
                  <CardDescription
                    >{possessive} cumulative points after each completed week.</CardDescription
                  >
                </CardHeader>
                <CardContent>
                  <SeasonTrendChart rows={trendRows} showLegend={false} />
                </CardContent>
              </Card>
            {/if}

            <div class="grid gap-6 xl:grid-cols-2">
              {#if teamRows.length > 0}
                <Card>
                  <CardHeader>
                    <CardTitle>Accuracy by team</CardTitle>
                    <CardDescription
                      >{possessive}
                      {data.seasonYear} results grouped by the team backed.</CardDescription
                    >
                  </CardHeader>
                  <CardContent class="overflow-x-auto px-2 sm:px-6">
                    <Table class="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          {@render teamHead('Team', 'team')}
                          {@render teamHead('Record', 'record')}
                          {@render teamHead('Win %', 'accuracy', 'right')}
                          {@render teamHead('Pts', 'points', 'right')}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {#each teamRows as row (row.team_id)}
                          <TableRow>
                            <TableCell class="font-medium" title={row.team_name}>
                              {row.team_short_name}
                            </TableCell>
                            <TableCell>{@render wlp(row.wins, row.losses, row.pushes)}</TableCell>
                            <TableCell class="text-right">{formatAccuracy(row.accuracy)}</TableCell>
                            <TableCell class="text-right">{row.points}</TableCell>
                          </TableRow>
                        {/each}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              {/if}

              {#if weightRows.length > 0}
                <Card>
                  <CardHeader>
                    <CardTitle>Accuracy by weight</CardTitle>
                    <CardDescription
                      >{possessive}
                      {data.seasonYear} confidence-level results, including each All-In.</CardDescription
                    >
                  </CardHeader>
                  <CardContent class="overflow-x-auto px-2 sm:px-6">
                    <Table class="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Weight</TableHead>
                          <TableHead>Record</TableHead>
                          <TableHead class="text-right">Win %</TableHead>
                          <TableHead class="text-right">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {#each weightRows as row (row.weight)}
                          <TableRow class={row.weight === 'A' ? 'bg-primary/5' : undefined}>
                            <TableCell>
                              {#if row.weight === 'A'}
                                <Badge>All-In</Badge>
                              {:else}
                                {weightLabel(row.weight)}
                              {/if}
                            </TableCell>
                            <TableCell>{@render wlp(row.wins, row.losses, row.pushes)}</TableCell>
                            <TableCell class="text-right">{formatAccuracy(row.accuracy)}</TableCell>
                            <TableCell class="text-right font-medium">{row.points}</TableCell>
                          </TableRow>
                        {/each}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              {/if}
            </div>
          {:else}
            <Card class="border-dashed">
              <CardHeader>
                <CardTitle>No settled picks for {emptyStateSubject} in {data.seasonYear}</CardTitle>
                <CardDescription>Select another player or season.</CardDescription>
              </CardHeader>
            </Card>
          {/if}
        </TabsContent>

        <TabsContent value="career" class="space-y-6">
          <!-- Career summary -->
          <CareerSummary entry={selectedCareer} isYou={isCareerYou} />

          <!-- All-time accuracy breakdowns -->
          {#if allTimeTeamRows.length > 0 || allTimeWeightRows.length > 0}
            <div>
              <h2 class="text-xl font-semibold tracking-tight">All-time accuracy</h2>
              <p class="mt-1 text-sm text-muted-foreground">Aggregated across all seasons.</p>
            </div>
            <div class="grid gap-6 xl:grid-cols-2">
              {#if allTimeTeamRows.length > 0}
                <Card>
                  <CardHeader>
                    <CardTitle>Accuracy by team</CardTitle>
                    <CardDescription>All-time results grouped by the team backed.</CardDescription>
                  </CardHeader>
                  <CardContent class="overflow-x-auto px-2 sm:px-6">
                    <Table class="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          {@render allTimeTeamHead('Team', 'team')}
                          {@render allTimeTeamHead('Record', 'record')}
                          {@render allTimeTeamHead('Win %', 'accuracy', 'right')}
                          {@render allTimeTeamHead('Pts', 'points', 'right')}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {#each allTimeTeamRows as row (row.team_id)}
                          <TableRow>
                            <TableCell class="font-medium" title={row.team_name}>
                              {row.team_short_name}
                            </TableCell>
                            <TableCell>{@render wlp(row.wins, row.losses, row.pushes)}</TableCell>
                            <TableCell class="text-right">{formatAccuracy(row.accuracy)}</TableCell>
                            <TableCell class="text-right">{row.points}</TableCell>
                          </TableRow>
                        {/each}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              {/if}

              {#if allTimeWeightRows.length > 0}
                <Card>
                  <CardHeader>
                    <CardTitle>Accuracy by weight</CardTitle>
                    <CardDescription>All-time confidence-level results.</CardDescription>
                  </CardHeader>
                  <CardContent class="overflow-x-auto px-2 sm:px-6">
                    <Table class="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Weight</TableHead>
                          <TableHead>Record</TableHead>
                          <TableHead class="text-right">Win %</TableHead>
                          <TableHead class="text-right">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {#each allTimeWeightRows as row (row.weight)}
                          <TableRow class={row.weight === 'A' ? 'bg-primary/5' : undefined}>
                            <TableCell>
                              {#if row.weight === 'A'}
                                <Badge>All-In</Badge>
                              {:else}
                                {weightLabel(row.weight)}
                              {/if}
                            </TableCell>
                            <TableCell>{@render wlp(row.wins, row.losses, row.pushes)}</TableCell>
                            <TableCell class="text-right">{formatAccuracy(row.accuracy)}</TableCell>
                            <TableCell class="text-right font-medium">{row.points}</TableCell>
                          </TableRow>
                        {/each}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              {/if}
            </div>
          {/if}
        </TabsContent>

        {#if SHOW_HEAD_TO_HEAD}
          <TabsContent value="head-to-head" class="space-y-6">
            {#if headToHead.length > 0}
              <section class="space-y-3" aria-labelledby="head-to-head-heading">
                <div>
                  <h2 id="head-to-head-heading" class="text-2xl font-semibold tracking-tight">
                    Head to head
                  </h2>
                  <p class="text-sm text-muted-foreground">
                    {possessive} weighted results against each player on games you both shared.
                  </p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {#each headToHead as row (row.opponentUserId)}
                    <Card class="gap-3 py-4">
                      <CardHeader class="px-4">
                        <CardTitle class="text-base">
                          {subjectLabel} <span class="text-muted-foreground">vs</span>
                          {row.opponentDisplayName}
                        </CardTitle>
                        <CardDescription>{row.gamesCompared} games compared</CardDescription>
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
              </section>
            {/if}
          </TabsContent>
        {/if}
      </Tabs>
    {/if}
  {/if}
</section>
