<script lang="ts">
  // Svelte 5 runes
  let { children } = $props();
  import "../app.css";

  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  import Menu from '@lucide/svelte/icons/menu';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';

  let theme = $state<'cerberus' | 'modern'>('cerberus');
  $effect(() => document.documentElement.setAttribute('data-theme', theme));

  const nav = [
    { href: '/', label: 'Games' },
    { href: '/picks', label: 'My Picks' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/admin', label: 'Admin' } // placeholder for later
  ];
</script>

<div class="min-h-svh flex flex-col">
  <AppBar>
    {#snippet lead()} <Menu size={20} aria-hidden="true" /> {/snippet}
    <span class="font-semibold">NFL BETS</span>
    {#snippet trail()}
      <button
        class="btn preset-tonal"
        on:click={() => (theme = theme === 'cerberus' ? 'modern' : 'cerberus')}
        aria-label="Toggle theme"
      >
        {#if theme === 'cerberus'} <Moon size={18} /> {:else} <Sun size={18} /> {/if}
      </button>
    {/snippet}
  </AppBar>

  <nav class="border-b border-surface-600/20">
    <ul class="container mx-auto flex flex-wrap gap-4 p-3 text-sm">
      {#each nav as n}
        <li>
          <a class="hover:underline" href={n.href} data-sveltekit-preload-data="hover">{n.label}</a>
        </li>
      {/each}
    </ul>
  </nav>

  <main class="container mx-auto p-4 flex-1">
    {@render children()}
  </main>
</div>
