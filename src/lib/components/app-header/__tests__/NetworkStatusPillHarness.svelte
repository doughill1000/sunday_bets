<script lang="ts">
  // Test-only harness: provides a QueryClient context around the pill (it reads the cache via
  // `useQueryClient`) plus an optional failing query so the pill can observe an error-with-data
  // state. `withFailingQuery` is off by default so the offline-branch test starts from a clean
  // cache.
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import NetworkStatusPill from '../NetworkStatusPill.svelte';
  import FailingQuery from './FailingQuery.svelte';

  let { client, withFailingQuery = false }: { client: QueryClient; withFailingQuery?: boolean } =
    $props();
</script>

<QueryClientProvider {client}>
  {#if withFailingQuery}
    <FailingQuery />
  {/if}
  <NetworkStatusPill />
</QueryClientProvider>
