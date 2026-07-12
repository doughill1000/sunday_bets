<script lang="ts">
  // Test-only child of the pill harness: an *active* query (real observer) that starts with
  // `initialData` (so it retains data) and then fails its background refetch — reproducing the
  // "stale-while-revalidate refetch failed but last-good data is kept" state the pill exists to
  // surface (audit S5, ADR-0017).
  import { createQuery } from '@tanstack/svelte-query';

  createQuery(() => ({
    queryKey: ['stats', 'test-group', 2025],
    queryFn: async () => {
      throw new Error('refetch failed');
    },
    initialData: { retained: true },
    retry: false
  }));
</script>
