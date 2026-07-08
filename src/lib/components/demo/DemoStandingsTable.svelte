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
      <TableHead class="text-right">W</TableHead>
      <TableHead class="text-right">L</TableHead>
      <TableHead class="text-right">P</TableHead>
      <TableHead class="text-right">Miss</TableHead>
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
        <TableCell class="text-right font-semibold tabular-nums">{r.total_points}</TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
{#if dropActive}
  <p class="mt-3 text-xs text-muted-foreground">{dropNote}</p>
{/if}
