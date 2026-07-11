<script lang="ts">
  // Standings table for the demo leaderboard (#460). Mirrors the real /leaderboard table markup
  // (which lives inline in that page, not a shared component) so the demo reads identically for
  // both the season and all-time views, fed from the frozen snapshot instead of a live query.
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import UserAvatar from '$lib/components/UserAvatar.svelte';

  type Row = {
    user_id: string;
    display_name: string;
    avatar_key: string | null;
    rank: number;
    wins: number;
    losses: number;
    pushes: number;
    missed: number;
    total_points: number;
  };

  let {
    rows,
    personaUserId,
    championUserId = null,
    dropActive = false,
    dropNote = "Total drops each player's lowest week. W-L-P count every week."
  }: {
    rows: Row[];
    personaUserId: string;
    championUserId?: string | null;
    dropActive?: boolean;
    dropNote?: string;
  } = $props();
</script>

<Table data-testid="demo-standings-table">
  <TableHeader>
    <TableRow>
      <TableHead class="w-12 text-center">#</TableHead>
      <TableHead>Player</TableHead>
      <!-- Mobile: W-L-P collapse into one "Rec" cell and Miss is dropped so Total stays
           on-screen at 390px; the full breakdown returns from `sm` up (mirrors /leaderboard). -->
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
      {@const isYou = r.user_id === personaUserId}
      {@const isFirst = r.rank === 1}
      {@const isChampion = r.user_id === championUserId}
      <TableRow class={isYou ? 'bg-primary/10 font-semibold' : isFirst ? 'bg-muted/40' : undefined}>
        <TableCell class="text-center">
          {#if isFirst}
            <span class="text-base" aria-label="rank 1">🏆</span>
          {:else}
            <span class="font-semibold tabular-nums">{r.rank}</span>
          {/if}
        </TableCell>
        <!-- max-w-0 + truncate keeps a long name from pushing Total off-screen at 390px
             (mirrors /leaderboard). -->
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
{#if dropActive}
  <p class="mt-3 text-xs text-muted-foreground">{dropNote}</p>
{/if}
