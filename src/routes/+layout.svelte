<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/app-header/AppHeader.svelte';
  import BottomTabBar from '$lib/components/app-header/BottomTabBar.svelte';
  import NavProgress from '$lib/components/app-header/NavProgress.svelte';
  import WelcomeGuide from '$lib/components/howto/WelcomeGuide.svelte';
  import EngagementBanner from '$lib/components/pwa/EngagementBanner.svelte';
  import RecapFlash from '$lib/components/recap/RecapFlash.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { navigating } from '$app/state';
  import { registerSW } from 'virtual:pwa-register';

  let { children, data } = $props();
  const supabase = $derived(data.supabase);
  const session = $derived(data.session);
  const user = $derived(data.user);
  const isAdmin = $derived(data.isAdmin);
  const userProfile = $derived(data.userProfile ?? null);
  const memberships = $derived(data.memberships ?? []);
  const groupId = $derived(data.groupId ?? null);
  const latestRecap = $derived(data.latestRecap ?? null);

  onMount(() => {
    // autoUpdate strategy: the SW installs silently and onNeedRefresh never
    // fires. vite-plugin-pwa's registerSW already reloads the page when a new
    // SW takes control (workbox-window's `controlling` event, guarded by
    // `isUpdate` so it does NOT reload on the first install). We must not add
    // our own unguarded `controllerchange` reload — that fires when the SW
    // claims the client on first load and reloads mid-navigation.
    registerSW({ immediate: true, onOfflineReady() {} });

    let removeVisibilityListener: (() => void) | undefined;
    if ('serviceWorker' in navigator) {
      // Force an update check whenever the user returns to the app —
      // iOS only checks on navigation and throttles to ~24h otherwise.
      // When the check finds a new SW, the registerSW reload above kicks in.
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      removeVisibilityListener = () =>
        document.removeEventListener('visibilitychange', handleVisibility);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => {
      removeVisibilityListener?.();
      sub.subscription.unsubscribe();
    };
  });
</script>

<NavProgress />

<div class="flex min-h-svh flex-col bg-background text-foreground">
  <header
    class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="container mx-auto flex h-14 items-center px-4">
      <AppHeader
        {user}
        canSeeAdmin={isAdmin}
        displayName={userProfile?.displayName ?? ''}
        avatarKey={userProfile?.avatarKey ?? null}
        {memberships}
        activeGroupId={groupId}
      />
    </div>
  </header>

  <main class="container mx-auto flex-1 p-4 pb-20 sm:pb-4">
    <EngagementBanner {user} />
    {#if navigating?.to?.url.pathname.startsWith('/stats')}
      {@render statsSkeleton()}
    {:else if navigating?.to?.url.pathname.startsWith('/group')}
      {@render groupSkeleton()}
    {:else}
      {@render children()}
    {/if}
    <Toaster />
  </main>

  {#if user}
    <BottomTabBar />
    <WelcomeGuide guideSeenAt={userProfile?.guideSeenAt ?? null} {user} />
    <RecapFlash recap={latestRecap} />
  {/if}
</div>

{#snippet statsSkeleton()}
  <section class="mx-auto w-full max-w-screen-xl space-y-6" aria-hidden="true">
    <div class="h-8 w-48 animate-pulse rounded bg-muted" />
    <div class="flex gap-2">
      {#each [0, 1, 2, 3] as i (i)}
        <div class="h-8 w-20 animate-pulse rounded-md bg-muted" />
      {/each}
    </div>
    <div class="flex gap-2">
      <div class="h-10 w-24 animate-pulse rounded bg-muted" />
      <div class="h-10 w-24 animate-pulse rounded bg-muted" />
    </div>
    <div class="h-64 w-full animate-pulse rounded-xl bg-muted" />
    <div class="h-48 w-full animate-pulse rounded-xl bg-muted" />
    <div class="h-40 w-full animate-pulse rounded-xl bg-muted" />
  </section>
{/snippet}

{#snippet groupSkeleton()}
  <section class="mx-auto max-w-2xl space-y-6 p-4" aria-hidden="true">
    <div class="h-8 w-56 animate-pulse rounded bg-muted" />
    <div class="h-64 w-full animate-pulse rounded-xl bg-muted" />
    <div class="h-48 w-full animate-pulse rounded-xl bg-muted" />
  </section>
{/snippet}
