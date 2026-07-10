<script lang="ts">
  // Hot/Cold module for /league (issue #428): the teams on the longest current ATS cover
  // (Hot) and non-cover (Cold) runs, each with its last-4 form. Reads league_ats_streaks
  // (over league_ats_base, #425) — the streak/push convention is the view's, restated in the
  // caption. Pure display; no fetching (streaks ship in the season /api/league payload).
  import type { LeagueTeamStreak } from '$lib/types/server/league';
  import { partitionHotCold, formatStreak } from '$lib/utils/leagueStreak';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';

  let { streaks }: { streaks: LeagueTeamStreak[] } = $props();

  const split = $derived(partitionHotCold(streaks));
  // Cap each list so the module stays a glance, not a second full table.
  const MAX = 8;
  const hot = $derived(split.hot.slice(0, MAX));
  const cold = $derived(split.cold.slice(0, MAX));
  const hasStreaks = $derived(hot.length > 0 || cold.length > 0);
</script>

{#snippet streakList(teams: LeagueTeamStreak[], tone: 'hot' | 'cold', emptyLabel: string)}
  {#if teams.length === 0}
    <p class="text-xs text-muted-foreground">{emptyLabel}</p>
  {:else}
    <div
      class="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground"
    >
      <span>Team</span>
      <span>Last 4</span>
    </div>
    <ul class="space-y-1.5">
      {#each teams as team (team.teamId)}
        <li class="flex items-center justify-between gap-2 text-sm">
          <span class="flex items-center gap-2">
            <Badge variant={tone === 'hot' ? 'default' : 'destructive'} class="tabular-nums">
              {formatStreak(team)}
            </Badge>
            <span class="font-medium" title={team.teamName}>{team.teamShortName}</span>
          </span>
          <span class="text-xs text-muted-foreground tabular-nums">
            <span class="sr-only">Last 4: </span>{team.last4.wins}-{team.last4.losses}-{team.last4
              .pushes}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<Card data-testid="league-hot-cold">
  <CardHeader>
    <CardTitle>Hot &amp; cold</CardTitle>
    <CardDescription>
      Current ATS cover streaks and last-4 form. A push against the spread neither extends nor
      starts a streak, so a team coming off a push shows no active run.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {#if !hasStreaks}
      <p class="text-sm text-muted-foreground">
        No active streaks yet — every team is coming off a push or has no graded games.
      </p>
    {:else}
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="space-y-3">
          <h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Hot — covering
          </h3>
          {@render streakList(hot, 'hot', 'No teams on a cover streak.')}
        </div>
        <div class="space-y-3">
          <h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Cold — not covering
          </h3>
          {@render streakList(cold, 'cold', 'No teams on a non-cover streak.')}
        </div>
      </div>
    {/if}
  </CardContent>
</Card>
