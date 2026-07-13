<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/app-header/AppHeader.svelte';
  import BottomTabBar from '$lib/components/app-header/BottomTabBar.svelte';
  import NavProgress from '$lib/components/app-header/NavProgress.svelte';
  import NetworkStatusPill from '$lib/components/app-header/NetworkStatusPill.svelte';
  import WelcomeGuide from '$lib/components/howto/WelcomeGuide.svelte';
  import EngagementBanner from '$lib/components/pwa/EngagementBanner.svelte';
  import RecapFlash from '$lib/components/recap/RecapFlash.svelte';
  import FeedbackWidget from '$lib/components/feedback/FeedbackWidget.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { page, navigating } from '$app/state';
  import { browser, dev } from '$app/environment';
  import { registerSW } from 'virtual:pwa-register';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import {
    persistQueryClientRestore,
    persistQueryClientSubscribe
  } from '@tanstack/svelte-query-persist-client';
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
  import { getQueryClient, makePersistOptions } from '$lib/query/client';
  import { DEFAULT_THEME_MODE, applyThemeMode, type ThemeMode } from '$lib/theme';

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

  // Resolved theme preference (#532). SSR (hooks.server.ts) + the app.html script set the
  // correct <html> class for first paint; this keeps it in sync afterwards — a saved pref
  // (surfaced here via invalidateAll) and, in `system` mode, the OS flipping at runtime.
  const themeMode = $derived<ThemeMode>(userProfile?.themePref ?? DEFAULT_THEME_MODE);
  $effect(() => {
    const mode = themeMode;
    applyThemeMode(mode);
    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  // Auth screens (/auth, /auth/reset, /auth/error) own the full viewport: their own
  // centered brand lockup is the only logo, so the app-shell chrome — the header (which
  // carries a second logo + nav to gated pages) and the bottom tab bar — is suppressed
  // here. This makes the pre-login experience read like a native app's launch screen
  // rather than a logged-out app section.
  const isAuthRoute = $derived(page.url.pathname.startsWith('/auth'));

  // The public demo (#460) is unauthenticated and owns its own chrome (demo nav + sign-up
  // CTAs via /demo/+layout.svelte), so the authenticated app shell — header + bottom tab bar,
  // both linking to gated pages — is suppressed here, the same way the auth screens are.
  const isDemoRoute = $derived(page.url.pathname.startsWith('/demo'));

  let isChampion = $state(false);
  $effect(() => {
    void data.championUserId?.then((champId) => {
      isChampion = champId != null && champId === data.user?.id;
    });
  });

  // Show a section skeleton only when *entering* Stats or the Members & manage subpage from
  // another section — not on intra-section navigations (e.g. season switches via goto), which
  // would otherwise blank the current page to a skeleton on every filter change. The League home
  // (/league) is deliberately absent: it renders instantly from its client cache (ADR-0017).
  const enteringSection = $derived.by(() => {
    const to = navigating?.to?.url.pathname;
    const from = navigating?.from?.url.pathname;
    if (!to) return null;
    for (const section of ['/stats', '/league/manage'] as const) {
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
    {#if isAuthRoute}
      <!-- Bare auth screen: no header/tab bar, and the page is vertically centered so
           its brand lockup sits front and center like a native launch/login screen. -->
      <main class="container mx-auto flex flex-1 flex-col justify-center p-4">
        {@render children()}
      </main>
    {:else if isDemoRoute}
      <!-- Public demo: no authenticated app shell; the /demo layout renders its own nav
           and sign-up CTAs around the frozen-snapshot pages. -->
      <main class="flex-1">
        {@render children()}
      </main>
    {:else}
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
        {:else if enteringSection === '/league/manage'}
          {@render manageSkeleton()}
        {:else}
          {@render children()}
        {/if}
      </main>

      {#if user}
        <BottomTabBar />
        <!-- Offline/stale indicator for the cached read screens (audit S5, ADR-0017): a single
             shell-level pill so every surface inherits it. Inside the QueryClientProvider (the
             whole shell is), so it can read the query cache. -->
        <NetworkStatusPill />
        <WelcomeGuide guideSeenAt={userProfile?.guideSeenAt ?? null} {user} />
        <FeedbackWidget {groupId} />
        {#await data.latestRecap then recap}
          {#await data.recapSeen then seen}
            <RecapFlash {recap} alreadySeen={seen} />
          {/await}
        {/await}
      {/if}
    {/if}

    <!-- Global toast host. Follows the resolved theme (#532) via an explicit `theme`
         prop — the vendored Sonner otherwise reads mode-watcher, which is never mounted
         here; passing the mode bypasses it and lets Sonner resolve `system` itself.
         Lifted above the mobile bottom tab bar (pb-20 = 5rem) so a toast never covers
         primary nav right after the user acts (audit S4). closeButton gives every toast a
         manual dismiss. -->
    <Toaster theme={themeMode} closeButton mobileOffset={{ bottom: '5rem' }} />
  </div>
{/snippet}

{#snippet statsSkeleton()}
  <!-- Mirrors the /stats IA (#518): heading, one context bar, then the edge hero + cards. -->
  <section class="mx-auto w-full max-w-screen-xl space-y-6" aria-hidden="true">
    <div class="h-8 w-48 animate-pulse rounded bg-muted" />
    <div class="flex items-center justify-between gap-2">
      <div class="h-9 w-28 animate-pulse rounded-md bg-muted" />
      <div class="h-9 w-32 animate-pulse rounded-md bg-muted" />
    </div>
    <div class="h-40 w-full animate-pulse rounded-xl bg-muted" />
    <div class="h-28 w-full animate-pulse rounded-xl bg-muted" />
    <div class="h-48 w-full animate-pulse rounded-xl bg-muted" />
  </section>
{/snippet}

{#snippet manageSkeleton()}
  <section class="mx-auto max-w-2xl space-y-6 p-4" aria-hidden="true">
    <div class="h-8 w-56 animate-pulse rounded bg-muted" />
    <div class="h-64 w-full animate-pulse rounded-xl bg-muted" />
    <div class="h-48 w-full animate-pulse rounded-xl bg-muted" />
  </section>
{/snippet}
