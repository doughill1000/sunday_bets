<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { Menu, X, Trophy, User } from '@lucide/svelte/icons';

  let open = false;
  let canInstall = false;
  let deferredPrompt: any = null;

  // Optional: surface “Install app” in the menu for PWA
  onMount(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      canInstall = true;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  });

  async function installPwa() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    canInstall = false;
  }

  function closeOnEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<!-- Top App Bar -->
<header class="sticky top-0 z-40 bg-surface-900/80 backdrop-blur border-b border-white/10">
  <div class="mx-auto max-w-5xl h-12 px-3 flex items-center justify-between">
    <!-- Left: hamburger -->
    <button
      class="p-2 -ml-1 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
      aria-label="Open navigation menu"
      onclick={() => (open = true)}
    >
      <Menu size={20} />
    </button>

    <!-- Title / Logo -->
    <div class="flex-1 flex items-center justify-center md:justify-start">
      <a href="/" class="font-semibold tracking-wide">NFL BETS</a>
    </div>

    <!-- Right: quick actions -->
    <nav class="hidden md:flex items-center gap-4 text-sm">
      <a href="/week" class="opacity-90 hover:opacity-100">This Week</a>
      <a href="/leaderboard" class="opacity-90 hover:opacity-100 flex items-center gap-1">
        <Trophy size={16} /> Leaderboard
      </a>
      <a href="/picks" class="opacity-90 hover:opacity-100">My Picks</a>
      <a href="/admin" class="opacity-90 hover:opacity-100">Admin</a>
    </nav>

    <!-- Compact icons on mobile -->
    <div class="md:hidden flex items-center gap-1">
      <a href="/leaderboard" aria-label="Leaderboard" class="p-2 rounded hover:bg-white/5">
        <Trophy size={18} />
      </a>
      <a href="/account" aria-label="Account" class="p-2 rounded hover:bg-white/5">
        <User size={18} />
      </a>
    </div>
  </div>
</header>

<!-- Drawer + Scrim -->
{#if open}
  <!-- Scrim -->
  <div class="fixed inset-0 z-40 bg-black/50" transition:fade onclick={() => (open = false)} />
{/if}

<aside
  class="fixed z-50 inset-y-0 left-0 w-80 max-w-[85vw] bg-surface-900 border-r border-white/10 shadow-xl
         flex flex-col"
  in:fly={{ x: -24, duration: 150 }}
  out:fly={{ x: -24, duration: 150 }}
  aria-hidden={!open}
  class:hidden={!open}
  on:keydown={closeOnEsc}
  role="dialog"
  aria-label="Navigation"
>
  <div class="h-12 px-3 flex items-center justify-between border-b border-white/10">
    <span class="font-semibold">Menu</span>
    <button
      class="p-2 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label="Close menu"
      onclick={() => (open = false)}
    >
      <X size={18} />
    </button>
  </div>

  <nav class="p-3 space-y-1 text-sm">
    <a href="/week" class="block px-3 h-10 rounded flex items-center hover:bg-white/5">This Week</a>
    <a href="/picks" class="block px-3 h-10 rounded flex items-center hover:bg-white/5">My Picks</a>
    <a href="/leaderboard" class="block px-3 h-10 rounded flex items-center hover:bg-white/5"
      >Leaderboard</a
    >
    <a href="/admin" class="block px-3 h-10 rounded flex items-center hover:bg-white/5">Admin</a>
    <div class="my-2 h-px bg-white/10"></div>

    {#if canInstall}
      <button
        class="w-full px-3 h-10 rounded text-left font-medium bg-primary-600 hover:bg-primary-500"
        onclick={installPwa}
      >
        Install App
      </button>
    {/if}

    <a href="/settings" class="block px-3 h-10 rounded flex items-center hover:bg-white/5"
      >Settings</a
    >
    <a href="/account" class="block px-3 h-10 rounded flex items-center hover:bg-white/5">Account</a
    >
    <button class="w-full text-left px-3 h-10 rounded hover:bg-white/5">Sign out</button>
  </nav>

  <!-- Optional footer: API usage, season/week context -->
  <div class="mt-auto p-3 text-xs opacity-70 border-t border-white/10">Season 2025 • Week 1</div>
</aside>

<style>
  :global(html, body) {
    overscroll-behavior: none;
  }
</style>
