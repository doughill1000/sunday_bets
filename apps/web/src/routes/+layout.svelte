<script lang="ts">
  import "../app.css";
  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  let { children } = $props();
</script>

<div class="min-h-svh flex flex-col">
  <AppBar>
    {#snippet lead()} <span class="font-semibold">NFL Bets</span> {/snippet}
  </AppBar>

  <main class="container mx-auto p-4 flex-1">
    {@render children()}
  </main>
</div>
