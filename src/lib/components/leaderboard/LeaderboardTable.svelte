<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { type SeasonTotalsRow } from '$lib/types/server/leaderboard';

  export let rows: SeasonTotalsRow[] = [];
  export let seasonYear: number;
</script>

<Card class="mx-auto w-full shadow-sm">
  <CardHeader>
    <CardTitle class="text-xl">Season {seasonYear} Leaderboard</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-16 text-center">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead class="text-right">W</TableHead>
          <TableHead class="text-right">L</TableHead>
          <TableHead class="text-right">P</TableHead>
          <TableHead class="text-right">Miss</TableHead>
          <TableHead class="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each rows as r}
          <TableRow>
            <TableCell class="text-center font-semibold">{r.rank}</TableCell>
            <TableCell class="font-medium">{r.display_name}</TableCell>
            <TableCell class="text-right">{r.wins}</TableCell>
            <TableCell class="text-right">{r.losses}</TableCell>
            <TableCell class="text-right">{r.pushes}</TableCell>
            <TableCell class="text-right">{r.missed}</TableCell>
            <TableCell class="text-right font-semibold">{r.total_points}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </CardContent>
</Card>
