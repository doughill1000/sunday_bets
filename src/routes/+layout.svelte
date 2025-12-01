<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/app-header/AppHeader.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { registerSW } from 'virtual:pwa-register';

  let { children, data } = $props();
  const { supabase, session, user } = data;

  onMount(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // show your shadcn-svelte toast or a modal
        // e.g. ask user to refresh now:
        if (confirm('Update available. Refresh now?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        // optional: toast 'App is ready to work offline'
        // console.log('PWA ready for offline use');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => sub.subscription.unsubscribe();
  });
</script>

<!-- Page shell -->
<div class="flex min-h-svh flex-col bg-background text-foreground">
  <!-- Header using shadcn styling primitives -->
  <header
    class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="container mx-auto flex h-14 items-center px-4">
      <AppHeader {user} />
    </div>
  </header>

  <main class="container mx-auto flex-1 p-4">
    {@render children()}
    <Toaster />
  </main>
</div>
