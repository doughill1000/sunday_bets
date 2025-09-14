<script lang="ts">
  import AdminCard from './AdminCard.svelte';
  import { Button } from '$lib/components/ui/button';

  export let activeWeek: { id: number; week_number: number } | null;
  export let onNote: ((kind: 'success' | 'warn' | 'error', text: string) => void) | undefined;

  let grading = false;
  let gameId = '';
  let weekIdInput: number | '' = activeWeek?.id ?? '';
  let seasonIdInput: number | '' = '';

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  async function call(path: string, payload: object, successMsg: string) {
    grading = true;
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) note('success', successMsg);
      else note('error', body?.reason ?? `Failed (${res.status}).`);
    } catch {
      note('error', 'Network error.');
    } finally {
      grading = false;
    }
  }

  const gradeActiveWeek = () => {
    if (!activeWeek?.id) return note('warn', 'No active week.');
    call(
      '/api/admin/grade-week',
      { week_id: activeWeek.id },
      `Graded week #${activeWeek.week_number}.`
    );
  };
  const onGradeWeekManual = () => {
    const id = Number(weekIdInput);
    if (!Number.isInteger(id) || id <= 0) return note('warn', 'Invalid week id.');
    call('/api/admin/grade-week', { week_id: id }, `Graded week id ${id}.`);
  };
  const onGradeGame = () => {
    if (!gameId || !/^[0-9a-fA-F-]{36}$/.test(gameId)) return note('warn', 'Invalid game UUID.');
    call('/api/admin/grade-game', { game_id: gameId }, `Graded game ${gameId}.`);
    gameId = '';
  };
  const onGradeSeason = () => {
    const id = Number(seasonIdInput);
    if (!Number.isInteger(id) || id <= 0) return note('warn', 'Invalid season id.');
    call('/api/admin/grade-season', { season_id: id }, `Graded season id ${id}.`);
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
