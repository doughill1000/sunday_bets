<script lang="ts">
  // Test-only harness: PicksBoard now opens a `createQuery` for the live sweat board (#386),
  // which requires a QueryClient in context. This wraps it in a provider and forwards the
  // board's props through. The live query stays disabled unless a game is in its live window,
  // so these tests never actually fetch.
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import PicksBoard from '../PicksBoard.svelte';

  let { client, ...rest }: { client: QueryClient; [key: string]: unknown } = $props();
</script>

<QueryClientProvider {client}>
  <PicksBoard {...rest} />
</QueryClientProvider>
