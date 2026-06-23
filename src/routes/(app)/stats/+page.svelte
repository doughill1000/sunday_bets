<script lang="ts">
  import type { PageData } from './$types';
  import SeasonTrendChart from '$lib/components/stats/SeasonTrendChart.svelte';
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
  import { formatAccuracy, headToHeadForUser, weightLabel } from '$lib/utils/stats';

  let { data }: { data: PageData } = $props();

  // Light → All-In, so the highlighted All-In row sorts last.
  const WEIGHT_ORDER = ['L', 'M', 'H', 'A'];

  // Players come from season totals (already per-player and ranked). "You" first.
  const orderedPlayers = $derived.by(() => {
    const you = data.totals.find((t) => t.user_id === data.currentUserId);
    const others = data.totals.filter((t) => t.user_id !== data.currentUserId);
    return you ? [you, ...others] : data.totals;
  });

  let selectedUserId = $state<string | null>(
    data.totals.some((t) => t.user_id === data.currentUserId)
      ? data.currentUserId
      : (data.totals[0]?.user_id ?? null)
  );

  const selected = $derived(data.totals.find((t) => t.user_id === selectedUserId) ?? null);
  const isSelectedYou = $derived(selected != null && selected.user_id === data.currentUserId);
  const subjectLabel = $derived(isSelectedYou ? 'You' : (selected?.display_name ?? ''));
  const possessive = $derived(isSelectedYou ? 'Your' : `${selected?.display_name ?? ''}’s`);

  const atsAccuracy = $derived.by(() => {
    if (!selected) return null;
    const decided = selected.wins + selected.losses;
    return decided > 0 ? selected.wins / decided : null;
  });

  const trendRows = $derived(data.trend.filter((r) => r.user_id === selectedUserId));
  const teamRows = $derived(
    data.teamAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted(
        (a, b) => b.decisions - a.decisions || a.team_short_name.localeCompare(b.team_short_name)
      )
  );
  const weightRows = $derived(
    data.weightAccuracy
      .filter((r) => r.user_id === selectedUserId)
      .toSorted((a, b) => WEIGHT_ORDER.indexOf(a.weight) - WEIGHT_ORDER.indexOf(b.weight))
  );
  const headToHead = $derived(
    selectedUserId ? headToHeadForUser(data.headToHead, selectedUserId) : []
  );
</script>

{#snippet wlp(wins: number, losses: number, pushes: number)}
  <span class="text-success">{wins}</span>-<span class="text-destructive">{losses}</span>-<span
    class="text-warning">{pushes}</span
  >
{/snippet}

<svelte:head>
  <title>Stats | Sunday Bets</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="stats-heading">
  <div>
    <p class="text-sm font-medium text-muted-foreground">{data.seasonYear} season</p>
    <h1 id="stats-heading" class="text-3xl font-bold tracking-tight">Stats & history</h1>
    <p class="mt-1 text-muted-foreground">How you've performed against the spread this season.</p>
  </div>

  {#if data.totals.length === 0}
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
    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Select a player">
      {#each orderedPlayers as player (player.user_id)}
        {@const isYou = player.user_id === data.currentUserId}
        <Button
          role="tab"
          aria-selected={player.user_id === selectedUserId}
          variant={player.user_id === selectedUserId ? 'default' : 'outline'}
          size="sm"
          onclick={() => (selectedUserId = player.user_id)}
        >
          {isYou ? 'You' : player.display_name}
        </Button>
      {/each}
    </div>

    {#if selected}
      <!-- Summary -->
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
              <CardDescription>{possessive} results grouped by the team backed.</CardDescription>
            </CardHeader>
            <CardContent class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead class="text-right">Accuracy</TableHead>
                    <TableHead class="text-right">Pts</TableHead>
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
                >{possessive} confidence-level results, including each All-In.</CardDescription
              >
            </CardHeader>
            <CardContent class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Weight</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead class="text-right">Accuracy</TableHead>
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
    {/if}
  {/if}
</section>
