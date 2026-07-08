<script lang="ts">
  // /league primetime module (issue #427): favorite ATS cover rate by kickoff slot —
  // Thursday / Sunday / Monday night vs daytime. Reads the pre-shaped LeaguePrimetimeSlot
  // rows from the single /league payload; all cover math lives in coverPct (leagueAts.ts),
  // never here. Thin slots (early season, sparse imported years) carry an n= caveat rather
  // than presenting a noisy percentage as signal.
  import type { LeaguePrimetimeSlot } from '$lib/types/server/league';
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
  import {
    coverPct,
    isThinSample,
    LEAGUE_THIN_SAMPLE,
    PRIMETIME_SLOT_LABEL
  } from '$lib/utils/leagueAts';
  import { formatAccuracy } from '$lib/utils/stats';

  let { slots }: { slots: LeaguePrimetimeSlot[] } = $props();

  const hasThin = $derived(slots.some((s) => isThinSample(s.games)));
</script>

{#if slots.length > 0}
  <Card data-testid="league-primetime">
    <CardHeader>
      <CardTitle>Primetime vs. daytime</CardTitle>
      <CardDescription>
        How often the spread favorite covers by kickoff slot, league-wide.
      </CardDescription>
    </CardHeader>
    <CardContent class="overflow-x-auto">
      <Table class="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Slot</TableHead>
            <TableHead class="text-right">Fav cover</TableHead>
            <TableHead class="text-right">Record</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each slots as slot (slot.slot)}
            {@const thin = isThinSample(slot.games)}
            <TableRow>
              <TableCell class="font-medium whitespace-nowrap">
                {PRIMETIME_SLOT_LABEL[slot.slot]}
              </TableCell>
              <TableCell class="text-right">
                {formatAccuracy(
                  coverPct({ wins: slot.favoriteCovers, losses: slot.underdogCovers })
                )}
              </TableCell>
              <TableCell class="text-right tabular-nums text-muted-foreground">
                {slot.favoriteCovers}-{slot.underdogCovers}-{slot.pushes}{#if thin}<span
                    class="text-amber-600 dark:text-amber-500"
                    title="Small sample — treat with caution">*</span
                  >{/if}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>

      {#if hasThin}
        <p class="mt-3 text-xs text-muted-foreground">
          <span class="text-amber-600 dark:text-amber-500">*</span> Small sample — cover % from
          fewer than {LEAGUE_THIN_SAMPLE} games is noisy; treat with caution.
        </p>
      {/if}
    </CardContent>
  </Card>
{/if}
