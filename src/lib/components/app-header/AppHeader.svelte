<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';

  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';
  import HeaderMenu from '$lib/components/app-header/HeaderMenu.svelte';

  export let user: User | null = null;
  export let canSeeAdmin = false;

  let canInstall = false;
  let deferredPrompt: any = null;

  let menuOpen = false;
  const closeMenu = () => (menuOpen = false);

  onMount(() => {
    afterNavigate(() => {
      menuOpen = false;
    });

    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      canInstall = true;
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      canInstall = false;
      deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  });

  async function installPwa(e: MouseEvent) {
    e.preventDefault();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    canInstall = false;
  }
</script>

<header
  class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div class="mx-auto max-w-screen-xl px-2 sm:px-4">
    <div class="relative flex h-14 items-center">
      <HeaderAccount user={user} {canSeeAdmin} onNavigate={closeMenu} />

      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <a
          href="/"
          class="pointer-events-auto flex min-w-0 items-center font-semibold tracking-wide"
          aria-label="Sunday Bets home"
        >
          <img
            src="/icons/icon-192x192.png"
            srcset="/icons/icon-72x72.png 2x, /icons/icon-192x192.png 3x"
            alt="Sunday Bets logo"
            class="mr-2 h-10 w-10 shrink-0 md:h-12 md:w-12"
          />
        </a>
      </div>

      <HeaderMenu
        {canSeeAdmin}
        canInstall={canInstall}
        {installPwa}
        bind:open={menuOpen}
        onNavigate={closeMenu}
      />
    </div>
  </div>
</header>
