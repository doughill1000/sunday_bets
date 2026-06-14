<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';

  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';
  import HeaderMenu from '$lib/components/app-header/HeaderMenu.svelte';

  interface Props {
    user?: User | null;
    canSeeAdmin?: boolean;
  }

  let { user = null, canSeeAdmin = false }: Props = $props();

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }

  let canInstall = $state(false);
  let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);

  let menuOpen = $state(false);
  const closeMenu = () => (menuOpen = false);

  onMount(() => {
    afterNavigate(() => {
      menuOpen = false;
    });

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPrompt = e;
      canInstall = true;
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', () => {
      canInstall = false;
      deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
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
      <HeaderAccount {user} {canSeeAdmin} onNavigate={closeMenu} />

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
        {canInstall}
        {installPwa}
        bind:open={menuOpen}
        onNavigate={closeMenu}
      />
    </div>
  </div>
</header>
