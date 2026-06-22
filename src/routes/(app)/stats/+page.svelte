<script lang="ts">
  import type { PageData } from './$types';
  import SeasonTrendChart from '$lib/components/stats/SeasonTrendChart.svelte';
  import { Badge } from '$lib/components/ui/badge';
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
  import { formatAccuracy, weightLabel } from '$lib/utils/stats';

  let { data }: { data: PageData } = $props();

  const hasStats = $derived(
    data.trend.length > 0 ||
      data.teamAccuracy.length > 0 ||
      data.weightAccuracy.length > 0 ||
      data.headToHead.length > 0
  );
</script>

<svelte:head>
  <title>Stats | Sunday Bets</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="stats-heading">
  <div>
    <p class="text-sm font-medium text-muted-foreground">{data.seasonYear} season</p>
    <h1 id="stats-heading" class="text-3xl font-bold tracking-tight">Stats & history</h1>
    <p class="mt-1 text-muted-foreground">How every player has performed against the spread.</p>
  </div>

  {#if !hasStats}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No settled picks yet</CardTitle>
        <CardDescription>
          Season trends and player records will appear after the first games are graded.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    {#if data.trend.length > 0}
      <Card>
        <CardHeader>
          <CardTitle>Season trend</CardTitle>
          <CardDescription>Cumulative points after each completed week.</CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonTrendChart rows={data.trend} />
        </CardContent>
      </Card>
    {/if}

    <div class="grid gap-6 xl:grid-cols-2">
      {#if data.teamAccuracy.length > 0}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy by team</CardTitle>
            <CardDescription>Results grouped by the team each player backed.</CardDescription>
          </CardHeader>
          <CardContent class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead class="text-right">Accuracy</TableHead>
                  <TableHead class="text-right">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each data.teamAccuracy as row (`${row.user_id}-${row.team_id}`)}
                  <TableRow>
                    <TableCell class="font-medium">{row.display_name}</TableCell>
                    <TableCell title={row.team_name}>{row.team_short_name}</TableCell>
                    <TableCell>{row.wins}-{row.losses}-{row.pushes}</TableCell>
                    <TableCell class="text-right">{formatAccuracy(row.accuracy)}</TableCell>
                    <TableCell class="text-right">{row.points}</TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      {/if}

      {#if data.weightAccuracy.length > 0}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy by weight</CardTitle>
            <CardDescription>Confidence-level results, including each All-In.</CardDescription>
          </CardHeader>
          <CardContent class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead class="text-right">Accuracy</TableHead>
                  <TableHead class="text-right">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each data.weightAccuracy as row (`${row.user_id}-${row.weight}`)}
                  <TableRow class={row.weight === 'A' ? 'bg-primary/5' : undefined}>
                    <TableCell class="font-medium">{row.display_name}</TableCell>
                    <TableCell>
                      {#if row.weight === 'A'}
                        <Badge>All-In</Badge>
                      {:else}
                        {weightLabel(row.weight)}
                      {/if}
                    </TableCell>
                    <TableCell>{row.wins}-{row.losses}-{row.pushes}</TableCell>
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

    {#if data.headToHead.length > 0}
      <section class="space-y-3" aria-labelledby="head-to-head-heading">
        <div>
          <h2 id="head-to-head-heading" class="text-2xl font-semibold tracking-tight">
            Head to head
          </h2>
          <p class="text-sm text-muted-foreground">
            Weighted results on games both players shared.
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {#each data.headToHead as row (`${row.user_id}-${row.opponent_user_id}`)}
            <Card class="gap-3 py-4">
              <CardHeader class="px-4">
                <CardTitle class="text-base">
                  {row.display_name} <span class="text-muted-foreground">vs</span>
                  {row.opponent_display_name}
                </CardTitle>
                <CardDescription>{row.games_compared} games compared</CardDescription>
              </CardHeader>
              <CardContent class="flex items-end justify-between px-4">
                <div>
                  <p class="text-2xl font-bold">{row.wins}-{row.losses}-{row.pushes}</p>
                  <p class="text-xs text-muted-foreground">wins-losses-pushes</p>
                </div>
                <p class="text-sm font-medium">{row.points} to {row.opponent_points} pts</p>
              </CardContent>
            </Card>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</section>
