<script lang="ts">
  import { goto } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeaderboard } from '$lib/query/fetchers';
  import type { LeaderboardCachePayload } from '$lib/query/types';
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

  // Empty shape so the standings render stays valid while the query loads on a cache miss
  // (the pending branch in the Standings panel gates real render).
  const EMPTY_LEADERBOARD: LeaderboardCachePayload = {
    seasonYear: 0,
    totals: [],
    totalsCursor: null,
    championUserId: null,
    dropActive: false
  };

  const data = $derived({ ...(leaderboardQuery.data ?? EMPTY_LEADERBOARD), ...pageData });

  // `data.championUserId` would resolve to the layout's streamed champion Promise (added in
  // #339); the reigning champion for the standings crown comes from the cached standings
  // payload instead, which carries it synchronously.
  const championUserId = $derived((leaderboardQuery.data ?? EMPTY_LEADERBOARD).championUserId);

  let activeTab = $state(pageData.view);

  // When the user clicks the Weekly tab and we haven't loaded weekly data yet, trigger a navigation.
  let weeklyNavigated = $state(pageData.view === 'weekly');

  $effect(() => {
    if (activeTab === 'weekly' && !weeklyNavigated) {
      weeklyNavigated = true;
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'weekly');
      void goto(url.toString(), { noScroll: true, keepFocus: true });
    }
    if (activeTab === 'standings') {
      weeklyNavigated = false;
    }
  });
</script>

<svelte:head>
  <title>Leaderboard | Sunday Bets</title>
</svelte:head>

{#snippet standingsLoading()}
  <!-- Cache miss (no SSR initialData, nothing cached yet): skeleton while the query loads. -->
  <Card class="shadow-sm">
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
      <p class="mt-1 text-muted-foreground">{data.seasonYear} season.</p>
    </div>
    <SeasonPicker seasons={data.availableSeasons} selected={data.seasonYear} />
  </div>

  {#if data.latestWrappedSeason != null}
    <WrappedPromo groupId={data.groupId} seasonYear={data.latestWrappedSeason} />
  {/if}

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
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
        <Card class="overflow-x-auto shadow-sm">
          <CardHeader>
            <CardTitle>{data.seasonYear} standings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table data-testid="standings-table">
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12 text-center">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead class="text-right">W</TableHead>
                  <TableHead class="text-right">L</TableHead>
                  <TableHead class="text-right">P</TableHead>
                  <TableHead class="text-right">Miss</TableHead>
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
                    <TableCell>
                      <div class="flex items-center gap-2">
                        <UserAvatar
                          avatarKey={r.avatar_key ?? null}
                          displayName={r.display_name}
                          size="xs"
                          champion={isChampion}
                        />
                        {isYou ? `${r.display_name} (you)` : r.display_name}
                      </div>
                    </TableCell>
                    <TableCell class="text-right tabular-nums">{r.wins}</TableCell>
                    <TableCell class="text-right tabular-nums">{r.losses}</TableCell>
                    <TableCell class="text-right tabular-nums">{r.pushes}</TableCell>
                    <TableCell class="text-right tabular-nums">{r.missed}</TableCell>
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
  </Tabs>
</section>
