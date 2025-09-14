<script lang="ts">
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
  } from '$lib/components/ui/accordion';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { type WeeklyCumulativeRow } from '$lib/server/db/queries/leaderboard';
  export let rows: WeeklyCumulativeRow[] = [];
  export let seasonYear: number;

  const byUser = new Map<string, WeeklyCumulativeRow[]>();
  for (const r of rows) {
    const key = `${r.user_id}|${r.display_name}`;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(r);
  }
  // ensure each user's rows are ordered by week
  for (const arr of byUser.values()) arr.sort((a, b) => a.week_number - b.week_number);
</script>

<Card class="mx-auto w-full shadow-sm">
  <CardHeader>
    <CardTitle class="text-xl">Weekly Progress — Season {seasonYear}</CardTitle>
  </CardHeader>
  <CardContent>
    <Accordion type="multiple" class="w-full">
      {#each Array.from(byUser.entries()) as [key, userRows]}
        {#key key}
          <AccordionItem value={key} class="border-b">
            <AccordionTrigger>
              <div class="flex w-full items-center justify-between pr-4">
                <span class="font-medium">{userRows[0].display_name}</span>
                <span class="text-sm opacity-70">Total: {userRows.at(-1)?.season_total}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-20">Week</TableHead>
                    <TableHead class="text-right">Week Pts</TableHead>
                    <TableHead class="text-right">W-L-P-M</TableHead>
                    <TableHead class="text-right">Cumulative</TableHead>
                    <TableHead class="text-right">Rank (wk cume)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {#each userRows as r}
                    <TableRow>
                      <TableCell>{r.week_number}</TableCell>
                      <TableCell class="text-right">{r.week_points}</TableCell>
                      <TableCell class="text-right"
                        >{r.week_wins}-{r.week_losses}-{r.week_pushes}-{r.week_missed}</TableCell
                      >
                      <TableCell class="text-right font-medium">{r.cumulative_points}</TableCell>
                      <TableCell class="text-right">{r.cumulative_rank_this_week}</TableCell>
                    </TableRow>
                  {/each}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        {/key}
      {/each}
    </Accordion>
  </CardContent>
</Card>
