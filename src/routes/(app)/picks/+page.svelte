<script lang="ts">
  import type { PageData } from './$types';
  import PicksBoard from '$lib/components/picks/PicksBoard.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>My Picks</title>
</svelte:head>

<PicksBoard
  games={data.games}
  initialPicks={data.picks}
  week={data.week}
  social={data.social}
  groupPicks={data.groupPicks}
  allInDeclarations={data.allInDeclarations}
  pickStatusBoard={data.pickStatusBoard}
  userId={data.userId}
  currentUserDisplayName={data.currentUserDisplayName}
  isLastWeek={data.isLastWeek}
  finalWeekUnlimitedAllin={data.finalWeekUnlimitedAllin}
  membershipCount={data.membershipCount}
/>
