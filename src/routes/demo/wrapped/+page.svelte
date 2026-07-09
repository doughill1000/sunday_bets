<script lang="ts">
  import type { PageData } from './$types';
  import WrappedStory from '$lib/components/wrapped/WrappedStory.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';

  let { data }: { data: PageData } = $props();

  let activeTab = $state(data.player ? 'player' : 'league');
</script>

<section class="mx-auto w-full max-w-screen-xl space-y-8" aria-labelledby="demo-wrapped-heading">
  <div>
    <h1 id="demo-wrapped-heading" class="text-3xl font-bold tracking-tight">
      Season Wrapped — {data.completedSeasonYear}
    </h1>
    <p class="mt-1 text-muted-foreground">Your year in picks, by the numbers.</p>
  </div>

  {#if data.player && data.league}
    <Tabs bind:value={activeTab} class="w-full space-y-4">
      <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
        <TabsTrigger value="player" class={ACTIVE_TAB_TRIGGER_CLASS}>Your Year</TabsTrigger>
        <TabsTrigger value="league" class={ACTIVE_TAB_TRIGGER_CLASS}>The League</TabsTrigger>
      </TabsList>
      <TabsContent value="player">
        <WrappedStory row={data.player} />
      </TabsContent>
      <TabsContent value="league">
        <WrappedStory row={data.league} />
      </TabsContent>
    </Tabs>
  {:else if data.player}
    <WrappedStory row={data.player} />
  {:else if data.league}
    <WrappedStory row={data.league} />
  {:else}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No Wrapped in this snapshot</CardTitle>
        <CardDescription>Regenerate the demo snapshot to populate Season Wrapped.</CardDescription>
      </CardHeader>
    </Card>
  {/if}
</section>
