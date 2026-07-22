<script lang="ts">
  // Demo Season recaps (#460, ADR-0026 — extended #669): mirrors the real /recap archive —
  // every graded week's hardware paired with its Commissioner recap, reading the frozen
  // snapshot instead of a `createQuery`. The season shelf moved to the demo League's Honors
  // tab (#741), same as the real app.
  import type { PageData } from './$types';
  import BackLink from '$lib/components/BackLink.svelte';
  import RecapCard from '$lib/components/recap/RecapCard.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  let { data }: { data: PageData } = $props();

  const weeks = $derived(data.weeklyAwards.weeks);
  const recapByWeek = $derived(new Map(data.recaps.map((r) => [r.week_number, r])));
  const orphanRecaps = $derived(
    data.recaps.filter((r) => !weeks.some((w) => w.week_number === r.week_number))
  );
</script>

<svelte:head>
  <title>Season recaps | Hotshot Demo</title>
</svelte:head>

<!-- No `px-4 py-6` of its own — the demo layout already pads, and doubling it inset this
     archive further than its sibling /demo/wrapped (#768). -->
<div class="mx-auto max-w-2xl space-y-4">
  <div>
    <BackLink href="/demo/league" label="League" testId="recaps-back" />
    <div class="mt-1 flex items-center gap-2">
      <Sparkles class="h-5 w-5 text-primary-ink" />
      <h1 class="text-xl font-semibold">Season recaps</h1>
    </div>
    <p class="text-sm text-muted-foreground">
      Every graded week's hardware and the Commissioner's take, newest first.
    </p>
  </div>

  {#if weeks.length === 0 && data.recaps.length === 0}
    <p class="text-sm text-muted-foreground">No recaps in this snapshot.</p>
  {:else}
    <div class="space-y-4">
      {#each weeks as hardware (hardware.week_number)}
        <div class="scroll-mt-20 space-y-3" id="week-{hardware.week_number}">
          <WeeklyHardware {hardware} currentUserId={data.currentUserId} />
          {#if recapByWeek.has(hardware.week_number)}
            <RecapCard recap={recapByWeek.get(hardware.week_number)!} />
          {/if}
        </div>
      {/each}

      {#each orphanRecaps as recap (recap.id)}
        <RecapCard {recap} />
      {/each}
    </div>
  {/if}
</div>
