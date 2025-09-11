<script lang="ts">
  import type { PageData } from './$types';
  import PicksBoard from '$lib/components/picks/PicksBoard.svelte';

  export let data: PageData;
</script>

<svelte:head>
  <title>My Picks</title>
</svelte:head>

<PicksBoard games={data.games} initialPicks={data.picks} />
