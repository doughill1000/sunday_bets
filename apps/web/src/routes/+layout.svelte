<script lang="ts">
  import '../app.css';
  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  let { children } = $props();

  const nav = [
    { href: '/', label: 'Games' },
    { href: '/picks', label: 'My Picks' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/admin', label: 'Admin' } // later: hide if not admin
  ];
</script>

<div class="min-h-svh flex flex-col">
  <AppBar>
    {#snippet lead()}
      <span class="font-semibold">NFL Bets</span>
    {/snippet}
    <nav class="flex items-center gap-4 ml-6">
      {#each nav as n}
        <a class="text-sm hover:underline" href={n.href} data-sveltekit-preload-data="hover">
          {n.label}
        </a>
      {/each}
    </nav>
  </AppBar>

  <main class="container mx-auto p-4 flex-1">
    {@render children()}
  </main>
</div>
