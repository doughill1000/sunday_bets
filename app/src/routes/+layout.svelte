<script lang="ts">
  import '../app.css';
  import { AppBar } from '@skeletonlabs/skeleton-svelte';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';

  let { children, data } = $props();

  const { supabase, session } = data;

  onMount(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });
    return () => sub.subscription.unsubscribe();
  });
</script>

<div class="min-h-svh flex flex-col">
  <AppBar>
    <AppHeader />
  </AppBar>

  <main class="container mx-auto p-4 flex-1">
    {@render children()}
  </main>
</div>
