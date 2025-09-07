<script lang="ts">
  import { onMount } from 'svelte';
  import type { User } from '@supabase/supabase-js';
  import { isAdmin } from '$lib/auth/guards';
  import { registerSW } from 'virtual:pwa-register';

  // shadcn components
  import { Button } from '$lib/components/ui/button';
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
  import { Separator } from '$lib/components/ui/separator';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
  } from '$lib/components/ui/dropdown-menu';
  import {
    NavigationMenuRoot,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuLink
  } from '$lib/components/ui/navigation-menu';
  import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';

  // icons
  import { Menu, Trophy } from 'lucide-svelte';

  export let user: User | null = null;
  $: canSeeAdmin = isAdmin(user);

  let canInstall = false;
  let deferredPrompt: any = null;

  onMount(() => {
    try { registerSW({ immediate: true }); } catch {}

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
    return () => window.removeEventListener('beforeinstallprompt', handler);
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

<header class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div class="mx-auto max-w-screen-xl px-2 sm:px-4">
    <!-- RELATIVE FLEX ROW; NO GRID -->
    <div class="relative flex h-14 items-center">
      <!-- LEFT: flush-left, never collapses -->
      <div class="-ml-2 flex items-center shrink-0">
        <Sheet>
          <SheetTrigger>
            <Button size="icon" variant="ghost" aria-label="Open menu" class="rounded-xl">
              <Menu class="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="w-72 pl-4">
        <div class="mb-4 mt-2 font-semibold tracking-wide">SUNDAY BETS</div>
        <nav class="grid gap-1 text-sm">
          <a class="hover:bg-accent rounded px-2 py-2" href="/picks">My Picks</a>
          <a class="hover:bg-accent rounded px-2 py-2" href="/leaderboard">Leaderboard</a>
          {#if canSeeAdmin}
            <a class="hover:bg-accent rounded px-2 py-2" href="/admin">Admin</a>
          {/if}
        </nav>
        <Separator class="my-3" />
        {#if canInstall}
          <Button class="w-full" onclick={installPwa}>Install App</Button>
        {/if}
        <nav class="mt-2 grid gap-1 text-sm">
          <a class="hover:bg-accent rounded px-2 py-2" href="/auth/signout">Sign out</a>
        </nav>
        <div class="text-muted-foreground mt-6 text-xs">Season 2025 • Week 1</div>
      </SheetContent>
        </Sheet>
      </div>

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

      <div class="ml-auto -mr-2 flex items-center gap-2 shrink-0">
            <!-- User/account dropdown (mobile and desktop) -->
    {#if user}
      <DropdownMenu>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {#if canSeeAdmin}
            <DropdownMenuItem><a href="/admin">Admin</a></DropdownMenuItem>
          {/if}
          <DropdownMenuSeparator />
          <DropdownMenuItem><a href="/auth/signout">Sign out</a></DropdownMenuItem>
        </DropdownMenuContent>
        <DropdownMenuTrigger>
          <Button variant="ghost" class="gap-2">
            <Avatar class="h-6 w-6">
              <AvatarImage src={user.user_metadata?.avatar_url} alt="avatar" />
              <AvatarFallback>
                {(user.user_metadata?.full_name ?? user.email ?? 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    {:else}
      <Button variant="default"><a href="/auth">Sign in</a></Button>
    {/if}
        {#if user === null}
          <Button variant="default" class="rounded-xl"><a href="/auth">Sign in</a></Button>
        {/if}
      </div>
    </div>
  </div>
</header>