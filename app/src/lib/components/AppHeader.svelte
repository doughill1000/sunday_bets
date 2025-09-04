<script lang="ts">
  import { onMount } from 'svelte';
  import type { User } from '@supabase/supabase-js';
  import { isAdmin } from '$lib/auth/guards';

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
  import { Menu, Trophy, User as UserIcon } from 'lucide-svelte';

  export let user: User | null = null; // passed from layout
  $: canSeeAdmin = isAdmin(user);

  let canInstall = false;
  let deferredPrompt: any = null;

  onMount(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      canInstall = true;
    };
    window.addEventListener('beforeinstallprompt', handler);
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
  <div class="container mx-auto flex h-14 items-center px-4">
    <!-- Mobile: menu trigger -->
    <div class="md:hidden">
      <Sheet>
        <SheetTrigger>
          <Button size="icon" variant="ghost" aria-label="Open menu">
            <Menu class="size-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" class="w-72">
          <div class="mt-2 mb-4 font-semibold tracking-wide">NFL BETS</div>

          <nav class="grid gap-1 text-sm">
            <a class="rounded px-2 py-2 hover:bg-accent" href="/week">This Week</a>
            <a class="rounded px-2 py-2 hover:bg-accent" href="/picks">My Picks</a>
            <a class="rounded px-2 py-2 hover:bg-accent" href="/leaderboard">Leaderboard</a>
            {#if canSeeAdmin}
              <a class="rounded px-2 py-2 hover:bg-accent" href="/admin">Admin</a>
            {/if}
          </nav>

          <Separator class="my-3" />

          {#if canInstall}
            <Button class="w-full" onclick={installPwa}>Install App</Button>
          {/if}

          <nav class="mt-2 grid gap-1 text-sm">
            <a class="rounded px-2 py-2 hover:bg-accent" href="/settings">Settings</a>
            <a class="rounded px-2 py-2 hover:bg-accent" href="/account">Account</a>
            <a class="rounded px-2 py-2 hover:bg-accent" href="/auth/signout">Sign out</a>
          </nav>

          <div class="mt-6 text-xs text-muted-foreground">Season 2025 • Week 1</div>
        </SheetContent>
      </Sheet>
    </div>

    <!-- Brand -->
    <a href="/" class="ml-2 font-semibold tracking-wide md:ml-0">NFL BETS</a>

    <!-- Desktop nav -->
    <nav class="ml-6 hidden md:flex">
      <NavigationMenuRoot>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/week" class="px-3 py-2">This Week</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/picks" class="px-3 py-2">My Picks</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/leaderboard" class="px-3 py-2 flex items-center gap-1">
              <Trophy class="size-4" /> Leaderboard
            </NavigationMenuLink>
          </NavigationMenuItem>
          {#if canSeeAdmin}
            <NavigationMenuItem>
              <NavigationMenuLink href="/admin" class="px-3 py-2">Admin</NavigationMenuLink>
            </NavigationMenuItem>
          {/if}
        </NavigationMenuList>
      </NavigationMenuRoot>
    </nav>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Right side: user/account -->
    {#if user}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" class="gap-2">
            <Avatar class="h-6 w-6">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt="avatar"
              />
              <AvatarFallback>
                {(user.user_metadata?.full_name ?? user.email ?? 'U').slice(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span class="hidden sm:inline">
              {user.user_metadata?.full_name ?? user.email}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><a href="/account">Profile</a></DropdownMenuItem>
          <DropdownMenuItem><a href="/settings">Settings</a></DropdownMenuItem>
          {#if canSeeAdmin}
            <DropdownMenuItem><a href="/admin">Admin</a></DropdownMenuItem>
          {/if}
          <DropdownMenuSeparator />
          <DropdownMenuItem><a href="/auth/signout">Sign out</a></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    {:else}
      <div class="flex items-center gap-2">
        <a class="hidden md:inline text-sm opacity-80 hover:opacity-100" href="/leaderboard" aria-label="Leaderboard">
          <Trophy class="inline-block size-4 -mt-0.5" /> Leaderboard
        </a>
        <Button variant="default"><a href="/auth">Sign in</a></Button>
        <a class="md:hidden p-2 rounded hover:bg-accent" href="/account" aria-label="Account">
          <UserIcon class="size-5" />
        </a>
      </div>
    {/if}
  </div>
</header>
