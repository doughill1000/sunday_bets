<script lang="ts">
  import type { PageData } from './$types';
  import DemoPicksBoard from '$lib/components/demo/DemoPicksBoard.svelte';

  let { data }: { data: PageData } = $props();
</script>

<DemoPicksBoard liveWeek={data.liveWeek} personaName={data.personaName} />
