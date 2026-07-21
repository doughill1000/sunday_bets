<script lang="ts">
  import AdminCard from './AdminCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { gradeWeek, gradeGame, gradeSeason, type GradeResult } from '$lib/api/admin/grading';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { SHAREABLE_QUERY_ROOTS } from '$lib/query/keys';

  interface WeekOption {
    id: number;
    week_number: number;
    start_ts: string;
    end_ts: string;
    season_year: number;
    game_count: number;
  }
  interface SeasonOption {
    id: number;
    year: number;
  }
  interface WeekGame {
    id: string;
    label: string;
    hasFinal: boolean;
  }

  interface Props {
    activeWeek: { id: number; week_number: number } | null;
    weeks?: WeekOption[];
    seasons?: SeasonOption[];
    onNote?: (kind: 'success' | 'warn' | 'error', text: string) => void;
  }
  let { activeWeek, weeks = [], seasons = [], onNote }: Props = $props();

  const queryClient = useQueryClient();

  let grading = $state(false);

  // Primary: grade a week. Default to the active week if we have one, else the newest.
  let selectedWeekId = $state<number | ''>(activeWeek?.id ?? weeks[0]?.id ?? '');
  // Applies to every grade below: pull the latest finals from the Odds API first.
  let refreshFinals = $state(true);

  // Advanced — single game (games lazy-loaded when a week is chosen).
  let gameWeekId = $state<number | ''>(activeWeek?.id ?? weeks[0]?.id ?? '');
  let games = $state<WeekGame[]>([]);
  let gamesLoading = $state(false);
  let selectedGameId = $state('');

  // Advanced — whole season.
  let selectedSeasonId = $state<number | ''>(seasons[0]?.id ?? '');

  const selectedWeek = $derived(weeks.find((w) => w.id === Number(selectedWeekId)) ?? null);

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  function fmtRange(startTs: string, endTs: string): string {
    const opts = { month: 'short', day: 'numeric' } as const;
    const start = new Date(startTs).toLocaleDateString(undefined, opts);
    const end = new Date(endTs).toLocaleDateString(undefined, opts);
    return `${start}–${end}`;
  }

  function weekLabel(w: WeekOption): string {
    const active = activeWeek && w.id === activeWeek.id ? ' · active' : '';
    return `${w.season_year} Week ${w.week_number} · ${fmtRange(w.start_ts, w.end_ts)}${active}`;
  }

  function plural(n: number, one: string, many = `${one}s`): string {
    return `${n} ${n === 1 ? one : many}`;
  }

  /** "Graded 2025 Week 12 — 14 games, 96 picks settled." Falls back if counts are unknown. */
  function summaryNote(label: string, res: GradeResult): string {
    if (!res.gamesGraded && !res.picksSettled) return `Graded ${label}.`;
    return `Graded ${label} — ${plural(res.gamesGraded, 'game')}, ${plural(
      res.picksSettled,
      'pick'
    )} settled.`;
  }

  async function run(promise: Promise<GradeResult>, onDone: (res: GradeResult) => string) {
    grading = true;
    try {
      const res = await promise;
      note('success', onDone(res));
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

  function onGradeWeek() {
    const w = selectedWeek;
    if (!w) return note('warn', 'Pick a week to grade.');
    const detail = `${plural(w.game_count, 'game')} in this week${
      refreshFinals ? ', pulling the latest finals first' : ''
    }.`;
    if (!confirm(`Grade ${weekLabel(w)}?\n\n${detail}`)) return;
    run(gradeWeek({ week_id: w.id, refreshScores: refreshFinals }), (res) =>
      summaryNote(`${w.season_year} Week ${w.week_number}`, res)
    );
  }

  async function loadGames(weekId: number) {
    gamesLoading = true;
    selectedGameId = '';
    games = [];
    try {
      const res = await fetch(`/api/admin/week-games?week_id=${weekId}`);
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        games?: WeekGame[];
        reason?: string;
      };
      if (!res.ok || !body.ok) throw new Error(body.reason ?? 'Could not load games.');
      games = body.games ?? [];
    } catch (err) {
      note('error', err instanceof Error ? err.message : 'Could not load games.');
    } finally {
      gamesLoading = false;
    }
  }

  function onGameWeekChange(weekId: number) {
    gameWeekId = weekId;
    if (Number.isInteger(weekId) && weekId > 0) void loadGames(weekId);
  }

  function onGradeGame() {
    const g = games.find((x) => x.id === selectedGameId);
    if (!g) return note('warn', 'Pick a game to grade.');
    const detail = refreshFinals ? ' Pulling the latest final first.' : '';
    if (!confirm(`Grade ${g.label}?${detail}`)) return;
    run(gradeGame({ game_id: g.id, refreshScores: refreshFinals }), (res) =>
      summaryNote(g.label, res)
    );
  }

  function onGradeSeason() {
    const s = seasons.find((x) => x.id === Number(selectedSeasonId));
    if (!s) return note('warn', 'Pick a season to grade.');
    if (!confirm(`Re-grade the entire ${s.year} season? Every week in ${s.year} is regraded.`)) {
      return;
    }
    run(gradeSeason({ season_id: s.id, refreshScores: refreshFinals }), (res) =>
      summaryNote(`the ${s.year} season`, res)
    );
  }

  const selectClass =
    'border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
</script>

<AdminCard title="Admin • Grading" subtitle="Settle picks after games go final">
  {#if weeks.length === 0}
    <p class="text-sm text-muted-foreground">No weeks found to grade yet.</p>
  {:else}
    <!-- Primary: grade a week (active week pre-selected) -->
    <div class="space-y-3">
      <div class="space-y-1">
        <Label for="grade-week-select">Week to grade</Label>
        <select
          id="grade-week-select"
          bind:value={selectedWeekId}
          disabled={grading}
          class={selectClass}
        >
          {#each weeks as w (w.id)}
            <option value={w.id}>{weekLabel(w)}</option>
          {/each}
        </select>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          bind:checked={refreshFinals}
          disabled={grading}
          class="h-4 w-4 rounded border border-input"
        />
        Pull latest finals from the Odds API first
      </label>

      <Button variant="default" onclick={onGradeWeek} disabled={grading || !selectedWeek}>
        {grading ? 'Working…' : 'Grade week'}
      </Button>
    </div>

    <!-- Advanced: single game / whole season (rare fix-ups) -->
    <details class="mt-6 border-t pt-4">
      <summary class="cursor-pointer text-sm font-medium text-muted-foreground">
        Advanced — fix one game or re-grade a whole season
      </summary>

      <div class="mt-4 space-y-6">
        <!-- Single game -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Fix one game</div>
          <div class="space-y-1">
            <Label for="grade-game-week">Week</Label>
            <select
              id="grade-game-week"
              value={gameWeekId}
              onchange={(e) =>
                onGameWeekChange(Number((e.currentTarget as HTMLSelectElement).value))}
              disabled={grading}
              class={selectClass}
            >
              <option value="" disabled>Select a week…</option>
              {#each weeks as w (w.id)}
                <option value={w.id}>{weekLabel(w)}</option>
              {/each}
            </select>
          </div>

          <div class="space-y-1">
            <Label for="grade-game-select">Game</Label>
            <select
              id="grade-game-select"
              bind:value={selectedGameId}
              disabled={grading || gamesLoading || games.length === 0}
              class={selectClass}
            >
              {#if gamesLoading}
                <option value="">Loading games…</option>
              {:else if games.length === 0}
                <option value="">Pick a week to list its games</option>
              {:else}
                <option value="" disabled>Select a game…</option>
                {#each games as g (g.id)}
                  <option value={g.id}>{g.label}{g.hasFinal ? '' : ' (no final yet)'}</option>
                {/each}
              {/if}
            </select>
          </div>

          <Button variant="secondary" onclick={onGradeGame} disabled={grading || !selectedGameId}>
            {grading ? 'Working…' : 'Grade game'}
          </Button>
        </div>

        <!-- Whole season -->
        <div class="space-y-2">
          <div class="text-sm font-medium">Re-grade a whole season</div>
          <div class="space-y-1">
            <Label for="grade-season-select">Season</Label>
            <select
              id="grade-season-select"
              bind:value={selectedSeasonId}
              disabled={grading || seasons.length === 0}
              class={selectClass}
            >
              {#each seasons as s (s.id)}
                <option value={s.id}>{s.year}</option>
              {/each}
            </select>
          </div>

          <Button
            variant="secondary"
            onclick={onGradeSeason}
            disabled={grading || !selectedSeasonId}
          >
            {grading ? 'Working…' : 'Grade season'}
          </Button>
        </div>
      </div>
    </details>
  {/if}
</AdminCard>
