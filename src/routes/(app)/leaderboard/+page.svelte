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
  import { Button } from '$lib/components/ui/button';
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
  import { seasonScopeOptions } from '$lib/utils/stats';
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
  // season switches. Always loaded (not gated on the active scope) so switching to the
  // All-time window is an instant, flash-free flip, mirroring Career on /stats (#518).
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

  // Two page-level views (principle 2): Standings and Weekly are Tabs. The time window —
  // a season or All-time — is one control, folded into the season dropdown as a pinned
  // option (#518/#529), not a third tab. `scope` is a pure client flip; changing the
  // *season* navigates so the season-scoped query re-keys (ADR-0017).
  let activeTab = $state<'standings' | 'weekly'>(pageData.view);
  let scope = $state<'season' | 'alltime'>('season');

  // Fold the currently-displayed season into the option set so the dropdown can always
  // represent `scopeValue`. `resolveSeasonYear` can land on a season that has no standings
  // yet — a brand-new/pre-grading season (empty `availableSeasons` → the active season year),
  // or an out-of-range `?season=` — and `availableSeasons` is derived from graded standings
  // only (`group_season_years`), so that season is absent from it. Without this the <select>
  // value would match no <option>, silently blanking the control to `''` while the subtitle
  // still reads "<year> season." (this empty value is what tripped the all-time e2e spec).
  const scopeOptions = $derived(seasonScopeOptions([...data.availableSeasons, data.seasonYear]));
  const scopeValue = $derived(scope === 'alltime' ? 'alltime' : String(data.seasonYear));

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

  function onScopeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (value === 'alltime') {
      // All-time is a standings window — it has no Weekly view, so selecting it lands on
      // Standings.
      scope = 'alltime';
      activeTab = 'standings';
      return;
    }
    scope = 'season';
    if (value !== String(data.seasonYear)) {
      const url = new URL(window.location.href);
      url.searchParams.set('season', value);
      void goto(url.toString(), { invalidateAll: true, noScroll: true });
    }
  }

  // When the user clicks the Weekly tab and we haven't loaded weekly data yet, trigger a navigation.
  let weeklyNavigated = $state(pageData.view === 'weekly');

  $effect(() => {
    if (activeTab === 'weekly') {
      // Weekly is inherently season-scoped (there is no weekly All-time view), so leaving the
      // All-time window reverts to the season one when Weekly activates.
      if (scope !== 'season') scope = 'season';
      if (!weeklyNavigated) {
        weeklyNavigated = true;
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'weekly');
        void goto(url.toString(), { noScroll: true, keepFocus: true });
      }
    } else {
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

{#snippet standingsError(retry: () => void)}
  <!-- Only shown on a *hard* failure (error with no cached data); a background-refetch failure
       that still has last-good data keeps rendering the table, and the shell stale pill flags it
       (audit S5). Retry refetches this query rather than telling the user to reload the page. -->
  <Card class="border-dashed">
    <CardHeader>
      <CardTitle>Couldn't load standings</CardTitle>
      <CardDescription>Something went wrong fetching the standings.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="outline" size="sm" onclick={retry}>Retry</Button>
    </CardContent>
  </Card>
{/snippet}

<!-- One standings table for both windows (season + All-time), which differ only by title,
     footnote copy, testid, and whether the champion crown shows — so they no longer diverge as
     two hand-copied blocks. `rows` accepts either payload's entries (shared record fields). -->
{#snippet standingsTableCard(
  rows: Array<{
    user_id: string;
    display_name: string;
    avatar_key: string | null;
    wins: number;
    losses: number;
    pushes: number;
    missed: number;
    total_points: number;
    rank: number;
  }>,
  title: string,
  showDropFootnote: boolean,
  dropCopy: string,
  tableTestid: string,
  champion: string | null
)}
  <Card class="overflow-x-auto">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent class="px-3 sm:px-6">
      <Table data-testid={tableTestid}>
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
          {#each rows as r (r.user_id)}
            {@const isYou = r.user_id === data.currentUserId}
            {@const isFirst = r.rank === 1}
            {@const isChampion = champion != null && r.user_id === champion}
            <TableRow
              class={isYou ? 'bg-primary/10 font-semibold' : isFirst ? 'bg-muted/40' : undefined}
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
                  <span class="truncate">{isYou ? `${r.display_name} (you)` : r.display_name}</span>
                </div>
              </TableCell>
              <TableCell class="whitespace-nowrap text-right tabular-nums sm:hidden"
                >{r.wins}-{r.losses}-{r.pushes}</TableCell
              >
              <TableCell class="hidden text-right tabular-nums sm:table-cell">{r.wins}</TableCell>
              <TableCell class="hidden text-right tabular-nums sm:table-cell">{r.losses}</TableCell>
              <TableCell class="hidden text-right tabular-nums sm:table-cell">{r.pushes}</TableCell>
              <TableCell class="hidden text-right tabular-nums sm:table-cell">{r.missed}</TableCell>
              <TableCell class="text-right font-semibold tabular-nums">{r.total_points}</TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
      {#if showDropFootnote}
        <p class="mt-3 text-xs text-muted-foreground" data-testid="drop-worst-week-footnote">
          {dropCopy}
        </p>
      {/if}
    </CardContent>
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
        {scope === 'alltime' ? 'All-time · every season combined.' : `${data.seasonYear} season.`}
      </p>
    </div>
    <!-- One time-window control: seasons + a pinned "All-time" option (#518/#529), replacing
         the old split of a season dropdown plus a separate All-time tab. -->
    <select
      class={SELECT_CLASS}
      value={scopeValue}
      onchange={onScopeChange}
      aria-label="Select season or All-time"
      data-testid="leaderboard-scope"
    >
      {#if scopeOptions.latest !== null}
        <option value={String(scopeOptions.latest)}>This season · {scopeOptions.latest}</option>
      {/if}
      <option value="alltime">All-time</option>
      {#if scopeOptions.pastSeasons.length > 0}
        <optgroup label="Past seasons">
          {#each scopeOptions.pastSeasons as year (year)}
            <option value={String(year)}>{year}</option>
          {/each}
        </optgroup>
      {/if}
    </select>
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
      {#if scope === 'alltime'}
        {#if allTimeQuery.isPending}
          {@render standingsLoading()}
        {:else if allTimeQuery.isError && !allTimeQuery.data}
          {@render standingsError(() => allTimeQuery.refetch())}
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
          {@render standingsTableCard(
            allTime.totals,
            'All-time standings',
            allTime.dropActive,
            "Total drops each player's lowest week per season. W-L-P count every week.",
            'alltime-table',
            null
          )}
        {/if}
      {:else if leaderboardQuery.isPending}
        {@render standingsLoading()}
      {:else if leaderboardQuery.isError && !leaderboardQuery.data}
        {@render standingsError(() => leaderboardQuery.refetch())}
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
        {@render standingsTableCard(
          data.totals,
          `${data.seasonYear} standings`,
          data.dropActive,
          "Total drops each player's lowest week. W-L-P count every week.",
          'standings-table',
          championUserId
        )}
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
