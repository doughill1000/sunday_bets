<script lang="ts">
  import type { PageData } from './$types';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import WrappedStory from '$lib/components/wrapped/WrappedStory.svelte';
  import WrappedFlash from '$lib/components/wrapped/WrappedFlash.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';

  let { data }: { data: PageData } = $props();

  // Default to the personal view when the viewer has one; otherwise land on the league.
  let activeTab = $state(data.player ? 'player' : 'league');
</script>

<svelte:head>
  <title>Season Wrapped | Hotshot</title>
</svelte:head>

<WrappedFlash row={data.player ?? data.league} />

<section class="mx-auto w-full max-w-screen-xl space-y-8" aria-labelledby="wrapped-heading">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 id="wrapped-heading" class="text-3xl font-bold tracking-tight">
        Season Wrapped — {data.seasonYear}
      </h1>
      <p class="mt-1 text-muted-foreground">Your year in picks, by the numbers.</p>
    </div>
    <SeasonPicker seasons={data.availableSeasons} selected={data.seasonYear} />
  </div>

  {#if !data.league && !data.player}
    <Card class="border-dashed" data-testid="wrapped-empty">
      <CardHeader>
        <CardTitle>No Wrapped yet for {data.seasonYear}</CardTitle>
        <CardDescription>
          Season Wrapped appears once the season is complete and all picks are graded. Check back
          after the final week.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else if data.player && data.league}
    <Tabs bind:value={activeTab} class="w-full space-y-4">
      <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
        <TabsTrigger
          value="player"
          data-testid="wrapped-tab-player"
          class={ACTIVE_TAB_TRIGGER_CLASS}>Your Year</TabsTrigger
        >
        <TabsTrigger
          value="league"
          data-testid="wrapped-tab-league"
          class={ACTIVE_TAB_TRIGGER_CLASS}>The League</TabsTrigger
        >
      </TabsList>

      <TabsContent value="player" data-testid="wrapped-player-panel">
        <WrappedStory row={data.player} />
      </TabsContent>

      <TabsContent value="league" data-testid="wrapped-league-panel">
        <WrappedStory row={data.league} />
      </TabsContent>
    </Tabs>
  {:else if data.player}
    <section class="space-y-4" aria-labelledby="wrapped-player-heading">
      <h2 id="wrapped-player-heading" class="text-xl font-semibold tracking-tight">Your Year</h2>
      <WrappedStory row={data.player} />
    </section>
  {:else if data.league}
    <section class="space-y-4" aria-labelledby="wrapped-league-heading">
      <h2 id="wrapped-league-heading" class="text-xl font-semibold tracking-tight">The League</h2>
      <WrappedStory row={data.league} />
    </section>
  {/if}
</section>
