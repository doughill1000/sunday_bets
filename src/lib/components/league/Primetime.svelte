<script lang="ts">
  // /league primetime module (issue #427, meter treatment #517): favorite ATS cover rate by
  // kickoff slot — Thursday / Saturday / Sunday / Monday night vs daytime. Reads the pre-shaped
  // LeaguePrimetimeSlot rows from the single /league payload; all cover math lives in coverPct
  // (leagueAts.ts), never here. Cover % renders as a shared meter with a 50% baseline tick so it
  // never clips at 390px; thin slots (early season, sparse imported years) carry an n= caveat
  // rather than presenting a noisy percentage as signal.
  import type { LeaguePrimetimeSlot } from '$lib/types/server/league';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
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
    <CardContent>
      <ul class="space-y-3">
        {#each slots as slot (slot.slot)}
          {@const thin = isThinSample(slot.games)}
          {@const pct = coverPct({ wins: slot.favoriteCovers, losses: slot.underdogCovers })}
          <li>
            <div class="flex items-baseline justify-between gap-2 text-sm">
              <span class="font-medium whitespace-nowrap">{PRIMETIME_SLOT_LABEL[slot.slot]}</span>
              <span class="flex items-baseline gap-2">
                <span class="font-mono tabular-nums">{formatAccuracy(pct)}</span>
                <span class="text-xs text-muted-foreground tabular-nums">
                  {slot.favoriteCovers}-{slot.underdogCovers}-{slot.pushes}{#if thin}<span
                      class="text-warning"
                      title="Small sample — treat with caution">*</span
                    >{/if}
                </span>
              </span>
            </div>
            <CoverMeter {pct} class="mt-1.5" />
          </li>
        {/each}
      </ul>

      {#if hasThin}
        <p class="mt-3 text-xs text-muted-foreground">
          <span class="text-warning">*</span> Small sample — cover % from fewer than {LEAGUE_THIN_SAMPLE}
          games is noisy; treat with caution.
        </p>
      {/if}
    </CardContent>
  </Card>
{/if}
