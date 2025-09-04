<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';

  let { children, data } = $props();
  const { supabase, session, user } = data;

  onMount(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });
    return () => sub.subscription.unsubscribe();
  });
</script>

<!-- Page shell -->
<div class="min-h-svh flex flex-col bg-background text-foreground">
  <!-- Header using shadcn styling primitives -->
  <header class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="container mx-auto flex h-14 items-center px-4">
      <AppHeader user={user} />
    </div>
  </header>

  <main class="container mx-auto p-4 flex-1">
    {@render children()}
  </main>
</div>
