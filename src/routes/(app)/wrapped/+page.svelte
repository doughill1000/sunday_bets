<script lang="ts">
  import type { PageData } from './$types';
  import BackLink from '$lib/components/BackLink.svelte';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import WrappedStory from '$lib/components/wrapped/WrappedStory.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import Gift from '@lucide/svelte/icons/gift';

  let { data }: { data: PageData } = $props();

  // Default to the personal view when the viewer has one; otherwise land on the league.
  let activeTab = $state(data.player ? 'player' : 'league');
</script>

<svelte:head>
  <title>Season Wrapped | Hotshot</title>
</svelte:head>

<!-- Season Wrapped is the once-a-season set piece, reached from the /league honors card's
     "See the full Season Wrapped" door and from the WrappedFlash — never from the nav. It
     therefore carries its own way back (#768), and wears the same page-header anatomy as
     its sibling archive /recap: back link → icon + title → one line of what this is →
     season control. The Gift icon is deliberately the same mark as the honors card's door,
     so the CTA and the page it opens read as one move. -->
<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="wrapped-heading">
  <div>
    <BackLink href="/league" label="League" testId="wrapped-back" />
    <div class="mt-1 flex items-center gap-2">
      <Gift class="h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" />
      <h1 id="wrapped-heading" class="text-xl font-semibold">
        Season Wrapped — {data.seasonYear}
      </h1>
    </div>
    <p class="text-sm text-muted-foreground">Your year in picks, by the numbers.</p>

    <!-- SeasonPicker carries its own accessible name, so it needs no visible label under a
         heading that already names the year. It self-suppresses below two seasons, but the
         spacing wrapper would survive it, so the same count gates the wrapper here. -->
    {#if data.availableSeasons.length > 1}
      <div class="mt-3">
        <SeasonPicker seasons={data.availableSeasons} selected={data.seasonYear} />
      </div>
    {/if}
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
