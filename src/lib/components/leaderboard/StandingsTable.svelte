<script lang="ts">
  // Shared standings table for the season and All-time windows (#631), reused as-is by the
  // frozen demo (#669, ADR-0026) — extracted from `/league` where this markup used to live
  // inline as a page-local snippet. `rows` accepts either payload's entries (shared record
  // fields); `movementsByUser`/`commissionerIds` are optional so a caller with no rank-trend or
  // membership data (the demo) can render the same table without them.
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';

  type StandingsRow = {
    user_id: string;
    display_name: string;
    avatar_key: string | null;
    wins: number;
    losses: number;
    pushes: number;
    missed: number;
    total_points: number;
    rank: number;
  };

  let {
    rows,
    title,
    currentUserId,
    tableTestid,
    champion = null,
    movementsByUser = null,
    commissionerIds = new Set(),
    showDropFootnote = false,
    dropCopy = "Total drops each player's lowest week. W-L-P count every week."
  }: {
    rows: StandingsRow[];
    title: string;
    currentUserId: string | null;
    tableTestid: string;
    champion?: string | null;
    movementsByUser?: Map<string, number> | null;
    commissionerIds?: ReadonlySet<string>;
    showDropFootnote?: boolean;
    dropCopy?: string;
  } = $props();
</script>

<!-- Rank movement vs the previous graded week (#561). `delta` is previousRank − currentRank, so
     positive = climbed. Absent (undefined) or 0 renders a neutral dash; direction is conveyed by
     colour + icon and spelled out in the aria-label for screen readers. -->
{#snippet movement(delta: number | undefined)}
  {#if delta != null && delta > 0}
    <span
      class="flex items-center gap-0.5 text-[10px] font-medium text-success"
      data-testid="rank-movement"
      aria-label="up {delta} from last week"
    >
      <ArrowUp class="size-2.5" aria-hidden="true" />{delta}
    </span>
  {:else if delta != null && delta < 0}
    <span
      class="flex items-center gap-0.5 text-[10px] font-medium text-destructive"
      data-testid="rank-movement"
      aria-label="down {-delta} from last week"
    >
      <ArrowDown class="size-2.5" aria-hidden="true" />{-delta}
    </span>
  {:else}
    <span
      class="text-[10px] text-muted-foreground"
      data-testid="rank-movement"
      aria-label="no rank change from last week">—</span
    >
  {/if}
{/snippet}

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
          <!-- Record (W-L-P) rides on a muted line under each name rather than its own column,
               so long names keep the full column width and never push the Total column off-screen
               at 390px. Rank movement rides inside the existing "#" cell rather than adding a
               column. -->
          <TableHead class="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each rows as r (r.user_id)}
          {@const isYou = r.user_id === currentUserId}
          {@const isFirst = r.rank === 1}
          {@const isChampion = champion != null && r.user_id === champion}
          <TableRow
            class={isYou ? 'bg-primary/10 font-semibold' : isFirst ? 'bg-muted/40' : undefined}
          >
            <TableCell class="text-center">
              <div class="flex flex-col items-center leading-tight">
                {#if isFirst}
                  <span class="text-base" aria-label="rank 1">🏆</span>
                {:else}
                  <span class="font-semibold tabular-nums">{r.rank}</span>
                {/if}
                {#if movementsByUser != null}
                  {@render movement(movementsByUser.get(r.user_id))}
                {/if}
              </div>
            </TableCell>
            <!-- max-w-0 makes this the flexible column: with the table's w-full it absorbs the
                 leftover width instead of expanding to the (nowrap) name, and the inner truncate
                 keeps a long name from pushing Total off-screen. The record (W-L-P) sits on a
                 muted second line under the name so it stays visible without its own column. -->
            <TableCell class="max-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <UserAvatar
                  avatarKey={r.avatar_key ?? null}
                  displayName={r.display_name}
                  size="xs"
                  champion={isChampion}
                />
                <div class="min-w-0 leading-tight">
                  <div class="truncate">{isYou ? `${r.display_name} (you)` : r.display_name}</div>
                  <div class="text-xs font-normal tabular-nums text-muted-foreground">
                    {r.wins}-{r.losses}-{r.pushes}
                  </div>
                  <!-- The Commissioner marker (#660) gets its own line rather than sitting beside
                       the name or the record. `max-w-0` above shrinks this cell to its minimum so
                       the Total column can never be pushed off 390px — which leaves ~115px here,
                       too little to share: beside the name it truncated the name to two
                       characters, and appended to the record ("0-0-0 · Commissioner") it
                       truncated itself. Alone on a line it fits whole, and only commissioner
                       rows pay the extra height. -->
                  {#if commissionerIds.has(r.user_id)}
                    <div class="truncate text-xs font-normal text-muted-foreground">
                      Commissioner
                    </div>
                  {/if}
                </div>
              </div>
            </TableCell>
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
