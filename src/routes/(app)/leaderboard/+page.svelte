<script lang="ts">
  import { goto } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeaderboard, fetchAllTimeLeaderboard } from '$lib/query/fetchers';
  import type { LeaderboardCachePayload, AllTimeLeaderboardPayload } from '$lib/query/types';
  import type { PageData } from './$types';
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
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import WeeklyPicksBreakdown from '$lib/components/leaderboard/WeeklyPicksBreakdown.svelte';
  import WrappedPromo from '$lib/components/wrapped/WrappedPromo.svelte';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';

  let { data: pageData }: { data: PageData } = $props();

  // Shareable season standings come from a cached `createQuery` keyed by `(groupId, season)`:
  // a revisit renders the last value instantly and revalidates in the background (ADR-0017).
  // `pageData.initialLeaderboard` is the server-prefetched value (present on the initial/SSR
  // request) used as `initialData` so first paint has no flash; on a client-side cache miss
  // the query loads and the skeleton below shows. The Weekly view's user-specific breakdown
  // stays on `pageData` (server load). They merge below, `pageData` last.
  const leaderboardQuery = createQuery(() => ({
    queryKey: queryKeys.leaderboard(pageData.groupId, pageData.seasonYear, 'standings', null, null),
    queryFn: () => fetchLeaderboard(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialLeaderboard
  }));

  // All-time (career) totals (#376) — season-independent, so the query key uses a fixed
  // season/week slot (`0`, `null`) rather than `pageData.seasonYear`; it stays cached across
  // season switches on the other two tabs.
  const allTimeQuery = createQuery(() => ({
    queryKey: queryKeys.leaderboard(pageData.groupId, 0, 'alltime', null, null),
    queryFn: () => fetchAllTimeLeaderboard(fetch, pageData.groupId),
    initialData: pageData.initialAllTime
  }));

  // Empty shape so the standings render stays valid while the query loads on a cache miss
  // (the pending branch in the Standings panel gates real render).
  const EMPTY_LEADERBOARD: LeaderboardCachePayload = {
    seasonYear: 0,
    totals: [],
    totalsCursor: null,
    championUserId: null,
    dropActive: false
  };

  const EMPTY_ALLTIME: AllTimeLeaderboardPayload = {
    totals: [],
    dropActive: false
  };

  const data = $derived({ ...(leaderboardQuery.data ?? EMPTY_LEADERBOARD), ...pageData });
  const allTime = $derived(allTimeQuery.data ?? EMPTY_ALLTIME);

  // `data.championUserId` would resolve to the layout's streamed champion Promise (added in
  // #339); the reigning champion for the standings crown comes from the cached standings
  // payload instead, which carries it synchronously.
  const championUserId = $derived((leaderboardQuery.data ?? EMPTY_LEADERBOARD).championUserId);

  let activeTab = $state<'standings' | 'weekly' | 'alltime'>(pageData.view);

  // When the user clicks the Weekly tab and we haven't loaded weekly data yet, trigger a navigation.
  let weeklyNavigated = $state(pageData.view === 'weekly');

  $effect(() => {
    if (activeTab === 'weekly' && !weeklyNavigated) {
      weeklyNavigated = true;
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'weekly');
      void goto(url.toString(), { noScroll: true, keepFocus: true });
    }
    if (activeTab !== 'weekly') {
      weeklyNavigated = false;
    }
  });
</script>

<svelte:head>
  <title>Leaderboard | Hotshot</title>
</svelte:head>

{#snippet standingsLoading()}
  <!-- Cache miss (no SSR initialData, nothing cached yet): skeleton while the query loads. -->
  <Card>
    <CardContent class="space-y-3 p-6" aria-hidden="true">
      {#each [0, 1, 2, 3, 4, 5] as i (i)}
        <div class="h-8 w-full animate-pulse rounded bg-muted"></div>
      {/each}
    </CardContent>
  </Card>
{/snippet}

{#snippet standingsError()}
  <Card class="border-dashed">
    <CardHeader>
      <CardTitle>Couldn't load standings</CardTitle>
      <CardDescription>
        Something went wrong fetching the standings. Refresh the page to try again.
      </CardDescription>
    </CardHeader>
  </Card>
{/snippet}

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="leaderboard-heading">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1
        id="leaderboard-heading"
        data-testid="leaderboard-heading"
        class="text-3xl font-bold tracking-tight"
      >
        Leaderboard
      </h1>
      <p class="mt-1 text-muted-foreground" data-testid="leaderboard-subtitle">
        {activeTab === 'alltime'
          ? 'All-time · every season combined.'
          : `${data.seasonYear} season.`}
      </p>
    </div>
    {#if activeTab !== 'alltime'}
      <SeasonPicker seasons={data.availableSeasons} selected={data.seasonYear} />
    {/if}
  </div>

  {#if data.latestWrappedSeason != null}
    <WrappedPromo groupId={data.groupId} seasonYear={data.latestWrappedSeason} />
  {/if}

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
      <TabsTrigger
        value="standings"
        data-testid="leaderboard-tab-standings"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger
      >
      <TabsTrigger
        value="weekly"
        data-testid="leaderboard-tab-weekly"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Weekly</TabsTrigger
      >
      <TabsTrigger
        value="alltime"
        data-testid="leaderboard-tab-alltime"
        class={ACTIVE_TAB_TRIGGER_CLASS}>All-time</TabsTrigger
      >
    </TabsList>

    <TabsContent value="standings" data-testid="standings-panel">
      {#if leaderboardQuery.isPending}
        {@render standingsLoading()}
      {:else if leaderboardQuery.isError}
        {@render standingsError()}
      {:else if data.totals.length === 0}
        <Card class="border-dashed" data-testid="standings-empty">
          <CardHeader>
            <CardTitle>No standings yet</CardTitle>
            <CardDescription>
              Season standings will appear after the first games are graded.
            </CardDescription>
          </CardHeader>
        </Card>
      {:else}
        <Card class="overflow-x-auto">
          <CardHeader>
            <CardTitle>{data.seasonYear} standings</CardTitle>
          </CardHeader>
          <CardContent class="px-3 sm:px-6">
            <Table data-testid="standings-table">
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12 text-center">#</TableHead>
                  <TableHead>Player</TableHead>
                  <!-- Mobile: W-L-P collapse into one compact "Rec" cell and Miss is dropped so
                       the Total column (the ranking key) always stays on-screen at 390px. The
                       full per-stat breakdown returns from `sm` up. -->
                  <TableHead class="text-right sm:hidden">Rec</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">W</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">L</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">P</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">Miss</TableHead>
                  <TableHead class="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each data.totals as r (r.user_id)}
                  {@const isYou = r.user_id === data.currentUserId}
                  {@const isFirst = r.rank === 1}
                  {@const isChampion = r.user_id === championUserId}
                  <TableRow
                    class={isYou
                      ? 'bg-primary/10 font-semibold'
                      : isFirst
                        ? 'bg-muted/40'
                        : undefined}
                  >
                    <TableCell class="text-center">
                      {#if isFirst}
                        <span class="text-base" aria-label="rank 1">🏆</span>
                      {:else}
                        <span class="font-semibold tabular-nums">{r.rank}</span>
                      {/if}
                    </TableCell>
                    <!-- max-w-0 makes this the flexible column: with the table's w-full it
                         absorbs the leftover width instead of expanding to the (nowrap) name,
                         and the inner truncate keeps a long name from pushing Total off-screen. -->
                    <TableCell class="max-w-0">
                      <div class="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          avatarKey={r.avatar_key ?? null}
                          displayName={r.display_name}
                          size="xs"
                          champion={isChampion}
                        />
                        <span class="truncate"
                          >{isYou ? `${r.display_name} (you)` : r.display_name}</span
                        >
                      </div>
                    </TableCell>
                    <TableCell class="whitespace-nowrap text-right tabular-nums sm:hidden"
                      >{r.wins}-{r.losses}-{r.pushes}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.wins}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.losses}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.pushes}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.missed}</TableCell
                    >
                    <TableCell class="text-right font-semibold tabular-nums"
                      >{r.total_points}</TableCell
                    >
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
            {#if data.dropActive}
              <p class="mt-3 text-xs text-muted-foreground" data-testid="drop-worst-week-footnote">
                Total drops each player's lowest week. W-L-P count every week.
              </p>
            {/if}
          </CardContent>
        </Card>
      {/if}
    </TabsContent>

    <TabsContent value="weekly" data-testid="weekly-panel">
      {#if data.view === 'weekly' && data.weeks != null && data.breakdown != null}
        <WeeklyPicksBreakdown
          weeks={data.weeks}
          selectedWeek={data.selectedWeek}
          breakdown={data.breakdown}
        />
      {:else}
        <p class="text-sm text-muted-foreground">Loading…</p>
      {/if}
    </TabsContent>

    <TabsContent value="alltime" data-testid="alltime-panel">
      {#if allTimeQuery.isPending}
        {@render standingsLoading()}
      {:else if allTimeQuery.isError}
        {@render standingsError()}
      {:else if allTime.totals.length === 0}
        <Card class="border-dashed" data-testid="alltime-empty">
          <CardHeader>
            <CardTitle>No all-time standings yet</CardTitle>
            <CardDescription>
              All-time totals will appear once a season has been graded.
            </CardDescription>
          </CardHeader>
        </Card>
      {:else}
        <Card class="overflow-x-auto">
          <CardHeader>
            <CardTitle>All-time standings</CardTitle>
          </CardHeader>
          <CardContent class="px-3 sm:px-6">
            <Table data-testid="alltime-table">
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12 text-center">#</TableHead>
                  <TableHead>Player</TableHead>
                  <!-- Mobile: W-L-P collapse into one compact "Rec" cell and Miss is dropped so
                       the Total column (the ranking key) always stays on-screen at 390px. The
                       full per-stat breakdown returns from `sm` up. -->
                  <TableHead class="text-right sm:hidden">Rec</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">W</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">L</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">P</TableHead>
                  <TableHead class="hidden text-right sm:table-cell">Miss</TableHead>
                  <TableHead class="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each allTime.totals as r (r.user_id)}
                  {@const isYou = r.user_id === data.currentUserId}
                  {@const isFirst = r.rank === 1}
                  <TableRow
                    class={isYou
                      ? 'bg-primary/10 font-semibold'
                      : isFirst
                        ? 'bg-muted/40'
                        : undefined}
                  >
                    <TableCell class="text-center">
                      {#if isFirst}
                        <span class="text-base" aria-label="rank 1">🏆</span>
                      {:else}
                        <span class="font-semibold tabular-nums">{r.rank}</span>
                      {/if}
                    </TableCell>
                    <!-- max-w-0 + truncate: see the standings table above. -->
                    <TableCell class="max-w-0">
                      <div class="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          avatarKey={r.avatar_key ?? null}
                          displayName={r.display_name}
                          size="xs"
                        />
                        <span class="truncate"
                          >{isYou ? `${r.display_name} (you)` : r.display_name}</span
                        >
                      </div>
                    </TableCell>
                    <TableCell class="whitespace-nowrap text-right tabular-nums sm:hidden"
                      >{r.wins}-{r.losses}-{r.pushes}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.wins}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.losses}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.pushes}</TableCell
                    >
                    <TableCell class="hidden text-right tabular-nums sm:table-cell"
                      >{r.missed}</TableCell
                    >
                    <TableCell class="text-right font-semibold tabular-nums"
                      >{r.total_points}</TableCell
                    >
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
            {#if allTime.dropActive}
              <p class="mt-3 text-xs text-muted-foreground" data-testid="drop-worst-week-footnote">
                Total drops each player's lowest week per season. W-L-P count every week.
              </p>
            {/if}
          </CardContent>
        </Card>
      {/if}
    </TabsContent>
  </Tabs>
</section>
