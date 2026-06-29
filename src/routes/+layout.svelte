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
  import { browser, dev } from '$app/environment';
  import { registerSW } from 'virtual:pwa-register';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import {
    persistQueryClientRestore,
    persistQueryClientSubscribe
  } from '@tanstack/svelte-query-persist-client';
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
  import { getQueryClient, makePersistOptions } from '$lib/query/client';

  let { children, data } = $props();

  // One QueryClient per environment: the browser singleton (so SPA navigations reuse one
  // cache) on the client, a fresh per-request client on the server (ADR-0017). The same
  // provider renders on the server and client (no `{#if browser}` swap, which would
  // hydration-mismatch) so `createQuery` is never gated; IndexedDB persistence is wired up
  // separately in `onMount` below — browser-only and non-blocking.
  const queryClient = getQueryClient();
  const supabase = $derived(data.supabase);
  const session = $derived(data.session);
  const user = $derived(data.user);
  const isAdmin = $derived(data.isAdmin);
  const userProfile = $derived(data.userProfile ?? null);
  const memberships = $derived(data.memberships ?? []);
  const groupId = $derived(data.groupId ?? null);

  let isChampion = $state(false);
  $effect(() => {
    void data.championUserId?.then((champId) => {
      isChampion = champId != null && champId === data.user?.id;
    });
  });

  // Show a section skeleton only when *entering* Stats/Group from another section —
  // not on intra-section navigations (e.g. season switches via goto), which would
  // otherwise blank the current page to a skeleton on every filter change.
  const enteringSection = $derived.by(() => {
    const to = navigating?.to?.url.pathname;
    const from = navigating?.from?.url.pathname;
    if (!to) return null;
    for (const section of ['/stats', '/group'] as const) {
      if (to.startsWith(section) && !from?.startsWith(section)) return section;
    }
    return null;
  });

  onMount(() => {
    // Persist the shareable query cache to IndexedDB for cold-launch instant render
    // (ADR-0017). Browser-only (onMount), so SSR never touches IndexedDB. Non-gating: we
    // restore into the existing client and then subscribe to persist future changes —
    // `createQuery` is never paused on restore (unlike PersistQueryClientProvider).
    const persistOptions = { queryClient, ...makePersistOptions() };
    let unsubscribePersist: (() => void) | undefined;
    void persistQueryClientRestore(persistOptions).finally(() => {
      unsubscribePersist = persistQueryClientSubscribe(persistOptions);
    });

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
      unsubscribePersist?.();
    };
  });
</script>

<!-- The QueryClient is provided around the whole shell so any read screen can use
     `createQuery`. The same provider renders on server and client (persistence is wired
     up in onMount, not via a browser-only provider) so there is no hydration mismatch and
     queries are never gated on cache restore (ADR-0017). -->
<QueryClientProvider client={queryClient}>
  {@render appShell()}
  <!-- Skip the devtools under an automated browser (Playwright sets navigator.webdriver):
       its floating overlay otherwise intercepts e2e clicks (e.g. the comment composer). -->
  {#if dev && browser && !navigator.webdriver}
    <SvelteQueryDevtools />
  {/if}
</QueryClientProvider>

{#snippet appShell()}
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
          champion={isChampion}
        />
      </div>
    </header>

    <main class="container mx-auto flex-1 p-4 pb-20 sm:pb-4">
      <EngagementBanner {user} />
      {#if enteringSection === '/stats'}
        {@render statsSkeleton()}
      {:else if enteringSection === '/group'}
        {@render groupSkeleton()}
      {:else}
        {@render children()}
      {/if}
      <Toaster />
    </main>

    {#if user}
      <BottomTabBar />
      <WelcomeGuide guideSeenAt={userProfile?.guideSeenAt ?? null} {user} />
      {#await data.latestRecap then recap}
        <RecapFlash {recap} />
      {/await}
    {/if}
  </div>
{/snippet}

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
