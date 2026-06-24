<script lang="ts">
  import { goto } from '$app/navigation';
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

  const ACTIVE_TAB_TRIGGER_CLASS =
    'data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground';

  let { data }: { data: PageData } = $props();

  let activeTab = $state(data.view);

  // When the user clicks the Weekly tab and we haven't loaded weekly data yet, trigger a navigation.
  let weeklyNavigated = $state(data.view === 'weekly');

  $effect(() => {
    if (activeTab === 'weekly' && !weeklyNavigated) {
      weeklyNavigated = true;
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'weekly');
      void goto(url.toString(), { invalidateAll: true, noScroll: true, keepFocus: true });
    }
    if (activeTab === 'standings') {
      weeklyNavigated = false;
    }
  });
</script>

<svelte:head>
  <title>Leaderboard | Sunday Bets</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="leaderboard-heading">
  <div>
    <h1 id="leaderboard-heading" class="text-3xl font-bold tracking-tight">Leaderboard</h1>
    <p class="mt-1 text-muted-foreground">{data.seasonYear} season.</p>
  </div>

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger value="standings" class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger>
      <TabsTrigger value="weekly" class={ACTIVE_TAB_TRIGGER_CLASS}>Weekly</TabsTrigger>
    </TabsList>

    <TabsContent value="standings">
      {#if data.totals.length === 0}
        <Card class="border-dashed">
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
            <Table>
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
          </CardContent>
        </Card>
      {/if}
    </TabsContent>

    <TabsContent value="weekly">
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
