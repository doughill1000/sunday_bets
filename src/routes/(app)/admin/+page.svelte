<script lang="ts">
  import type { PageData } from './$types';
  import OddsSyncCard from '$lib/components/admin/OddsSyncCard.svelte';
  import GradingCard from '$lib/components/admin/GradingCard.svelte';

  let { data }: { data: PageData } = $props();

  // shared notification state
  let msg: { kind: 'success' | 'warn' | 'error'; text: string } | null = $state(null);

  function handleNote(kind: 'success' | 'warn' | 'error', text: string) {
    msg = { kind, text };
  }
</script>

<section class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
  <OddsSyncCard settings={data.settings} activeWeek={data.activeWeek} onNote={handleNote} />

  <GradingCard activeWeek={data.activeWeek} onNote={handleNote} />

  {#if msg}
    <div
      class="mt-2 rounded-xl border p-3 text-sm"
      class:border-green-500={msg.kind === 'success'}
      class:border-amber-500={msg.kind === 'warn'}
      class:border-red-500={msg.kind === 'error'}
    >
      {msg.text}
    </div>
  {/if}
</section>
