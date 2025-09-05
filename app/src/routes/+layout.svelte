<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';

  let { children, data } = $props();
  const { supabase, session, user } = data;

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => sub.subscription.unsubscribe();
  });
</script>

<!-- Page shell -->
<div class="bg-background text-foreground flex min-h-svh flex-col">
  <!-- Header using shadcn styling primitives -->
  <header
    class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur"
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
