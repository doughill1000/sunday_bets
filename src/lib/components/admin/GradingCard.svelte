<script lang="ts">
  import AdminCard from './AdminCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { gradeWeek, gradeGame, gradeSeason } from '$lib/api/admin/grading';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { SHAREABLE_QUERY_ROOTS } from '$lib/query/keys';

  interface Props {
    activeWeek: { id: number; week_number: number } | null;
    onNote?: (kind: 'success' | 'warn' | 'error', text: string) => void;
  }
  let { activeWeek, onNote }: Props = $props();

  const queryClient = useQueryClient();

  let grading = $state(false);
  let gameId = $state('');
  let weekIdInput = $state<number | ''>(activeWeek?.id ?? '');
  let seasonIdInput = $state<number | ''>('');

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  // Generic wrapper to handle loading state and errors for any API call
  async function handleApiCall(promise: Promise<unknown>, successMsg: string) {
    grading = true;
    try {
      await promise;
      note('success', successMsg);
      // Grading recomputes scores (and identity badges) across groups, so drop the cached
      // standings / stats / group reads — they revalidate on next visit (ADR-0017 boundary 5).
      await Promise.all(
        SHAREABLE_QUERY_ROOTS.map((root) => queryClient.invalidateQueries({ queryKey: [root] }))
      );
    } catch (err) {
      note('error', err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      grading = false;
    }
  }

  const gradeActiveWeek = () => {
    if (!activeWeek?.id) return note('warn', 'No active week.');
    handleApiCall(gradeWeek({ week_id: activeWeek.id }), `Graded week #${activeWeek.week_number}.`);
  };

  const onGradeWeekManual = () => {
    const id = Number(weekIdInput);
    if (!Number.isInteger(id) || id <= 0) return note('warn', 'Invalid week id.');
    handleApiCall(gradeWeek({ week_id: id, refreshScores: true }), `Graded week id ${id}.`);
  };

  const onGradeGame = () => {
    if (!gameId || !/^[0-9a-fA-F-]{36}$/.test(gameId)) return note('warn', 'Invalid game UUID.');
    handleApiCall(gradeGame({ game_id: gameId, refreshScores: true }), `Graded game ${gameId}.`);
    gameId = '';
  };

  const onGradeSeason = () => {
    const id = Number(seasonIdInput);
    if (!Number.isInteger(id) || id <= 0) return note('warn', 'Invalid season id.');
    handleApiCall(gradeSeason({ season_id: id, refreshScores: true }), `Graded season id ${id}.`);
    seasonIdInput = '';
  };
</script>

<AdminCard title="Admin • Grading" subtitle="Run graders over game / week / season">
  <div class="mb-5 grid items-end gap-3 sm:grid-cols-[1fr_auto]">
    <div>
      <div class="text-sm opacity-80">Active Week</div>
      <div class="text-lg font-semibold">
        {#if activeWeek}#{activeWeek.week_number} (id {activeWeek.id}){:else}—{/if}
      </div>
    </div>
    <Button variant="default" onclick={gradeActiveWeek} disabled={grading || !activeWeek}>
      {grading ? 'Working…' : 'Grade Active Week'}
    </Button>
  </div>

  <div class="mb-5 grid items-end gap-3 sm:grid-cols-[1fr_auto]">
    <div>
      <label class="text-sm opacity-80" for="weekId">Week ID</label>
      <input
        id="weekId"
        class="w-full rounded border bg-background p-2"
        type="number"
        min="1"
        bind:value={weekIdInput}
        placeholder="e.g. 12"
      />
    </div>
    <Button variant="secondary" onclick={onGradeWeekManual} disabled={grading}>
      {grading ? 'Working…' : 'Grade Week'}
    </Button>
  </div>

  <div class="mb-5 grid items-end gap-3 sm:grid-cols-[1fr_auto]">
    <div>
      <label class="text-sm opacity-80" for="gameId">Game ID (UUID)</label>
      <input
        id="gameId"
        class="w-full rounded border bg-background p-2"
        bind:value={gameId}
        placeholder="00000000-0000-4000-8000-000000000000"
      />
    </div>
    <Button variant="secondary" onclick={onGradeGame} disabled={grading}>
      {grading ? 'Working…' : 'Grade Game'}
    </Button>
  </div>

  <div class="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
    <div>
      <label class="text-sm opacity-80" for="seasonId">Season ID (int)</label>
      <input
        id="seasonId"
        class="w-full rounded border bg-background p-2"
        type="number"
        min="1"
        bind:value={seasonIdInput}
        placeholder="e.g. 2025 row id"
      />
    </div>
    <Button variant="secondary" onclick={onGradeSeason} disabled={grading}>
      {grading ? 'Working…' : 'Grade Season'}
    </Button>
  </div>
</AdminCard>
