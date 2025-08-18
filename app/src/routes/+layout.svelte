<script lang="ts">
  import '../app.css';
  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  import AppHeader from '$lib/components/AppHeader.svelte';
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
    <AppHeader />
  </AppBar>

  <main class="container mx-auto p-4 flex-1">
    {@render children()}
  </main>
</div>
