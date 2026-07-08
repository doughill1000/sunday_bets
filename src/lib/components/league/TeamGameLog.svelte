<script lang="ts">
  // Team drill-down game log for /league (issue #428): every graded game this team played
  // this season, from its own perspective in league_ats_base — opponent, line, cover margin,
  // ATS result. Lazily fetched (mounted only when a team's row expands) and cached per team
  // under the 'league' root (ADR-0017), so re-opening is instant. Opponent names come from
  // the team list already loaded on /league, so no extra lookup is needed here.
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeagueTeamGameLog } from '$lib/query/fetchers';
  import { formatLine, formatCoverMargin } from '$lib/utils/leagueGameLog';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';

  let {
    teamId,
    seasonYear,
    teamNamesById
  }: { teamId: number; seasonYear: number; teamNamesById: Map<number, string> } = $props();

  const logQuery = createQuery(() => ({
    queryKey: queryKeys.leagueTeam(teamId, seasonYear),
    queryFn: () => fetchLeagueTeamGameLog(fetch, teamId, seasonYear)
  }));

  const games = $derived(logQuery.data?.games ?? []);
  const opponentName = (id: number) => teamNamesById.get(id) ?? `#${id}`;

  const RESULT_LABEL = { win: 'Cover', loss: 'No cover', push: 'Push' } as const;
  const RESULT_VARIANT = { win: 'default', loss: 'destructive', push: 'secondary' } as const;
</script>

<div class="space-y-3">
  {#if logQuery.isPending}
    <div class="h-32 w-full animate-pulse rounded-lg bg-muted" aria-hidden="true"></div>
  {:else if logQuery.isError}
    <p class="text-sm text-muted-foreground">Couldn't load this team's game log. Try again.</p>
  {:else if games.length === 0}
    <p class="text-sm text-muted-foreground">No graded games with a line for this team yet.</p>
  {:else}
    <div class="overflow-x-auto">
      <Table class="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Wk</TableHead>
            <TableHead>Opponent</TableHead>
            <TableHead class="text-right">Line</TableHead>
            <TableHead class="text-right">Cover margin</TableHead>
            <TableHead class="text-right">ATS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each games as game (game.weekNumber)}
            <TableRow>
              <TableCell class="tabular-nums">{game.weekNumber}</TableCell>
              <TableCell class="whitespace-nowrap">
                <span class="text-muted-foreground">{game.isHome ? 'vs' : '@'}</span>
                <span class="font-medium">{opponentName(game.opponentTeamId)}</span>
              </TableCell>
              <TableCell class="text-right tabular-nums">{formatLine(game.spreadValue)}</TableCell>
              <TableCell class="text-right tabular-nums">{formatCoverMargin(game.margin)}</TableCell
              >
              <TableCell class="text-right">
                <Badge variant={RESULT_VARIANT[game.atsResult]}>
                  {RESULT_LABEL[game.atsResult]}
                </Badge>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
    <p class="text-xs text-muted-foreground">
      Line and margin are team-relative: a negative line means this team was favored; a positive
      cover margin means it covered. A push is a no-decision against the spread.
    </p>
  {/if}
</div>
