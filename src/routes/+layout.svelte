<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/app-header/AppHeader.svelte';
  import BottomTabBar from '$lib/components/app-header/BottomTabBar.svelte';
  import WelcomeGuide from '$lib/components/howto/WelcomeGuide.svelte';
  import EngagementBanner from '$lib/components/pwa/EngagementBanner.svelte';
  import RecapFlash from '$lib/components/recap/RecapFlash.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
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
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (confirm('Update available. Refresh now?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {}
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => sub.subscription.unsubscribe();
  });
</script>

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
    {@render children()}
    <Toaster />
  </main>

  {#if user}
    <BottomTabBar />
    <WelcomeGuide guideSeenAt={userProfile?.guideSeenAt ?? null} {user} />
    <RecapFlash recap={latestRecap} />
  {/if}
</div>
