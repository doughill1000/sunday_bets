<script lang="ts">
  // Test-only harness: the demo Picks page renders the real `PicksBoard`, which opens a
  // `createQuery` for the live sweat board and so needs a QueryClient in context, even in
  // `readonly` mode (the query is disabled, but `createQuery` itself still requires the
  // context to exist). Mirrors `picks/__tests__/PicksBoardHarness.svelte`.
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import DemoPicksPage from '../../../../routes/demo/+page.svelte';
  import type { PageData } from '../../../../routes/demo/$types';

  let { client, data }: { client: QueryClient; data: PageData } = $props();
</script>

<QueryClientProvider {client}>
  <DemoPicksPage {data} />
</QueryClientProvider>
