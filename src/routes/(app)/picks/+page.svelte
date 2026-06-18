<script lang="ts">
  import type { PageData } from './$types';
  import PicksBoard from '$lib/components/picks/PicksBoard.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>My Picks</title>
</svelte:head>

<PicksBoard games={data.games} initialPicks={data.picks} week={data.week} />
