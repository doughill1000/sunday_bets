<script lang="ts">
  import type { LayoutData } from './$types';
  import DemoNav from '$lib/components/demo/DemoNav.svelte';
  import DemoBanner from '$lib/components/demo/DemoBanner.svelte';

  let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
  <title>Sunday Bets — Live Demo</title>
  <meta
    name="description"
    content="See a full Sunday Bets season — picks, leaderboard, awards, and AI recaps — before you sign up."
  />
</svelte:head>

<DemoNav />

<div class="container mx-auto space-y-6 p-4 pb-16">
  <DemoBanner personaName={data.persona.displayName} />
  {@render children()}
</div>
