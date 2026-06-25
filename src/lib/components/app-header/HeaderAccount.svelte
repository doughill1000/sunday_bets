<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';

  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
  } from '$lib/components/ui/dropdown-menu';
  import UserAvatar from '$lib/components/UserAvatar.svelte';

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }

  interface Props {
    user?: User | null;
    canSeeAdmin?: boolean;
    displayName?: string;
    avatarKey?: string | null;
  }

  let { user = null, canSeeAdmin = false, displayName = '', avatarKey = null }: Props = $props();

  let canInstall = $state(false);
  let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
  let open = $state(false);

  onMount(() => {
    afterNavigate(() => {
      open = false;
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
    open = false;
  }

  const effectiveDisplayName = $derived(displayName || (user?.email ?? 'User'));
</script>

{#if user}
  <DropdownMenu bind:open>
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon" class="rounded-full" aria-label="Account menu">
        <UserAvatar {avatarKey} displayName={effectiveDisplayName} size="sm" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="font-normal">
        <div class="flex items-center gap-2">
          <UserAvatar {avatarKey} displayName={effectiveDisplayName} size="sm" />
          <span class="truncate text-sm font-medium">{effectiveDisplayName}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <a href="/group" class="w-full">Group</a>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <a href="/settings" class="w-full">Settings</a>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <a href="/how-to-play" class="w-full">How to Play</a>
      </DropdownMenuItem>
      {#if canSeeAdmin}
        <DropdownMenuItem>
          <a href="/admin" class="w-full">Admin</a>
        </DropdownMenuItem>
      {/if}
      {#if canInstall}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <button onclick={installPwa} class="w-full text-left">Install App</button>
        </DropdownMenuItem>
      {/if}
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <a href="/auth/signout" class="w-full">Sign out</a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
{:else}
  <Button variant="default">
    <a href="/auth">Sign in</a>
  </Button>
{/if}
