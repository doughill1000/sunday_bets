<script lang="ts">
  import { Segment } from '@skeletonlabs/skeleton-svelte';
  import { Check } from '@lucide/svelte/icons';

  import { picks, setPicks, selectTeam, setWeight } from '$lib/stores/picks';
  import { lockPick as lockPickApi } from '$lib/api/picks';
  import { TEAM_META, WEIGHTS, type TeamSide, type WeightCode } from '$lib/types/domain';
  import type { UIGame } from '$lib/types/ui';
  import { textOn } from '$lib/ui/color';
  import { kickoffPassed, canUseAce as canUseAceRule } from '$lib/domain/rules';
  import { onMount } from 'svelte';
  import type { PickEntry } from '$lib/types/server';

  export let data: { games: UIGame[]; picks: Record<string, PickEntry> };

  let initialized = false;
  onMount(() => {
    if (!initialized && data?.picks) {
      setPicks(data.picks);
      for (const g of games) {
        const entry = data.picks?.[g.id];
        const hasSelection = entry?.selected || entry?.lockedPick;
        if (!hasSelection) selectTeam(g.id, 'home');
      }
      initialized = true;
    }
  });

  const games = data.games ?? [];

  function teamVars(abbr: string) {
    const meta = TEAM_META[abbr] ?? { name: abbr, colors: ['#64748b', '#94a3b8'] as [string, string] };
    const [c1, c2] = meta.colors;
    const fg = textOn(c1, c2);
    return `--c1:${c1};--c2:${c2};--fg:${fg}`;
  }

  function isSelected(gameId: string, side: TeamSide) {
    const entry = $picks[gameId];
    const chosen = entry?.selected?.team ?? entry?.lockedPick?.team;
    return chosen === side;
  }

  async function onLock(g: UIGame) {
    const entry = $picks[g.id] ?? {};
    const team = (entry.selected?.team ?? entry.lockedPick?.team) as TeamSide | undefined;
    const weight = (entry.selected?.weight ?? entry.lockedPick?.weight) as WeightCode | undefined;

    if (!team || !weight) {
      alert('Pick a team and weight first.');
      return;
    }

    const res = await lockPickApi(g.id, team, weight);
    if (!res.ok) {
      alert(res.reason ?? 'Lock failed');
      return;
    }

    // minimal optimistic store update
    picks.update((s) => ({
      ...s,
      [g.id]: {
        ...(s[g.id] ?? {}),
        lockedPick: { team, weight },
        unlocksUsed: res.relock_used ? 1 : (s[g.id]?.unlocksUsed ?? 0)
      }
    }));
  }

  function formatKickoff(iso: string) {
    const d = new Date(iso);
    const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
    const date = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dow} ${date} ${time}`;
  }

  function spreadLine(g: UIGame): string {
    if (!g.spread || !g.spreadTeam) return 'No line';
    if (g.spread === '0') return 'PK';
    const favName = g.spreadTeam === 'home' ? g.home : g.away;
    return `${favName} -${g.spread}`;
  }

  function canUseAce(gameId: string) {
    return canUseAceRule(gameId, $picks);
  }
</script>

<h1 class="h3 mb-4">This Week’s Games</h1>

{#if games.length === 0}
  <p class="opacity-70">No scheduled games for the active week.</p>
{:else}
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each games as g (g.id)}
      {@const entry = $picks[g.id] ?? {}}
      {@const started = kickoffPassed(g.kickoff)}
      {@const locked = !!entry.lockedPick}
      {@const canChange = !started && !locked}
      {@const canRelock = !started && locked && (entry.unlocksUsed ?? 0) < 1}

      <article
        class="rounded-2xl p-4 border border-surface-600/20 bg-surface-500/5"
        aria-labelledby={`game-${g.id}-title`}
      >
        <header class="flex items-center justify-between mb-2">
          <div class="min-w-0">
            <h2 id={`game-${g.id}-title`} class="font-semibold truncate">{g.away} @ {g.home}</h2>
            <p class="text-xs opacity-70 truncate">{spreadLine(g)}</p>
          </div>
          <div class="flex items-center gap-2">
            <time class="text-xs opacity-70 whitespace-nowrap" datetime={g.kickoff}
              >{formatKickoff(g.kickoff)}</time
            >
            {#if locked}
              <span
                class="text-xs px-2 py-1 rounded-full bg-green-600/20 text-green-500"
                aria-label="Locked"
              >
                Locked
              </span>
            {/if}
          </div>
        </header>

        <!-- Team buttons -->
        <div class="flex gap-2" role="group" aria-label="Pick a team">
          <!-- Away -->
          <button
            class="btn btn-neutral flex-1"
            class:selected={isSelected(g.id, 'away')}
            style={teamVars(g.away)}
            aria-pressed={isSelected(g.id, 'away')}
            disabled={!canChange}
            on:click={() => selectTeam(g.id, 'away')}
          >
            <span class="font-semibold tracking-wide">{g.away}</span>
          </button>

          <!-- Home -->
          <button
            class="btn btn-neutral flex-1"
            class:selected={isSelected(g.id, 'home')}
            style={teamVars(g.home)}
            aria-pressed={isSelected(g.id, 'home')}
            disabled={!canChange}
            on:click={() => selectTeam(g.id, 'home')}
          >
            <span class="font-semibold tracking-wide">{g.home}</span>
          </button>
        </div>

        <div class="mt-3 grid grid-cols-1 md:grid-cols-[1fr,auto] items-center gap-3">
          <!-- Weights -->
          <div class="min-w-0">
            <label class="text-xs block mb-1" for={`w_${g.id}`}>Weight</label>

            <Segment
              name={'w_' + g.id}
              value={entry.selected?.weight ?? entry.lockedPick?.weight ?? 'L'}
              disabled={!canChange}
              onValueChange={(e) => setWeight(g.id, e.value as WeightCode)}
              classes="w-full"
            >
              {#each Object.entries(WEIGHTS) as [code, w]}
                <Segment.Item
                  value={code}
                  disabled={code === 'A' && !canUseAce(g.id)}
                  classes="px-3 py-[3px] flex-1"
                >
                  <div class="flex flex-col items-center leading-none">
                    <span class="font-semibold text-sm">{w.label}</span>
                    <span class="text-[10px] opacity-80 mt-[1px]">{w.points}</span>
                  </div>
                </Segment.Item>
              {/each}
            </Segment>

            {#if entry.selected?.weight === 'A' && !canUseAce(g.id)}
              <p class="text-[11px] mt-1 opacity-70">
                {WEIGHTS.A.label} has already been used on another game.
              </p>
            {/if}
          </div>

          <!-- Lock / Relock -->
          <div class="mt-3">
            {#if locked}
              <button
                class={`w-full h-10 font-semibold ${
                  canRelock
                    ? 'bg-warning-900 text-white hover:bg-warning-800'
                    : 'bg-surface-700 text-white opacity-50'
                }`}
                on:click={() => onLock(g)}
                disabled={!canRelock}
              >
                Relock
              </button>

              {#if canRelock}
                <p class="mt-1 text-[11px] text-center opacity-70">1 unlock remaining</p>
              {:else if (entry.unlocksUsed ?? 0) >= 1}
                <p class="mt-1 text-[11px] text-center opacity-70">0 unlock remaining</p>
              {/if}
            {:else}
              <button
                class="w-full h-10 font-semibold bg-success-900 text-white hover:bg-success-800 disabled:bg-surface-400"
                on:click={() => onLock(g)}
                disabled={!entry.selected ||
                  (entry.selected.weight === 'A' && !canUseAce(g.id)) ||
                  started}
              >
                Lock Pick
              </button>
            {/if}
          </div>

          {#if started}
            <p class="mt-2 text-xs opacity-70">Kickoff passed — picks locked.</p>
          {/if}
        </div>
      </article>
    {/each}
  </div>
{/if}

<style>
  /* use CSS variables provided by teamVars for accessible contrast */
  .btn[style] {
    --btn-bg: var(--c1);
    --btn-bg2: var(--c2);
    --btn-fg: var(--fg);
    background: linear-gradient(135deg, var(--btn-bg), var(--btn-bg2));
    color: var(--btn-fg);
  }

  /* selected state: stronger border / outline and ensure icon color */
  .btn[style].selected {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
    /* preserve visual weight on small buttons */
  }
</style>
