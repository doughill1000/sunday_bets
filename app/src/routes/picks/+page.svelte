<script lang="ts">
  import { Segment } from '@skeletonlabs/skeleton-svelte';
  import {
    picks,
    selectTeam,
    setWeight,
    lockPick,
    unlockPick,
    kickoffPassed,
    canUseAce
  } from '$lib/stores/picks';
  import { TEAM_META } from '$lib/teams';
  import { Check } from '@lucide/svelte/icons';
  import { textOn } from '$lib/ui/color';
  import { WEIGHTS } from '$lib/scoring';

  // ----- Types -----
  type Game = {
    id: string;
    kickoff: string; // ISO
    away: string;
    home: string;
    spreadTeam: 'away' | 'home';
    spread: number;
  };

  export let data: {
    games: Game[];
  };

  const games = data.games;

  function teamVars(abbr: string) {
    const meta = TEAM_META[abbr] ?? {
      name: abbr,
      colors: ['#64748b', '#94a3b8'] as [string, string]
    };
    const [c1, c2] = meta.colors;
    const fg = textOn(c1, c2);
    // expose as CSS variables so CSS can style elegantly
    return `--c1:${c1};--c2:${c2};--fg:${fg}`;
  }

  function isSelected(id: string, side: 'away' | 'home') {
    return ($picks[id]?.selected?.team ?? $picks[id]?.lockedPick?.team ?? '') === side;
  }

  function team(abbr: string) {
    return TEAM_META[abbr]?.name ?? abbr;
  }

  function onLock(g: Game) {
    const { ok, reason } = lockPick(g.id);
    if (!ok && reason) alert(reason);
  }

  function onUnlock(g: Game) {
    const { ok, reason } = unlockPick(g.id);
    if (!ok && reason) alert(reason);
  }

  function formatKickoff(iso: string) {
    const d = new Date(iso);
    const dow = d.toLocaleDateString(undefined, { weekday: 'short' }); // e.g., "Sun"
    const date = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }); // "9/7"
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); // "1:00 PM"
    return `${dow} ${date} ${time}`;
  }
</script>

<h1 class="h3 mb-4">This Week’s Games</h1>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {#each games as g}
    {@const entry = $picks[g.id] ?? {}}
    {@const locked = !!entry.lockedPick}
    {@const started = kickoffPassed(g.kickoff)}
    {@const canChange = !started && !locked}
    {@const canUnlock = !started && locked && (entry.unlocksUsed ?? 0) < 1}

    <article class="rounded-2xl p-4 border border-surface-600/20 bg-surface-500/5">
      <header class="flex items-center justify-between mb-2">
        <div class="min-w-0">
          <h2 class="font-semibold truncate">{g.away} @ {g.home}</h2>
          <p class="text-xs opacity-70 truncate">Line: ...</p>
        </div>
        <div class="flex items-center gap-2">
          <time class="text-xs opacity-70 whitespace-nowrap">{formatKickoff(g.kickoff)}</time>
          {#if locked}
            <span class="text-xs px-2 py-1 rounded-full bg-green-600/20 text-green-500">
              Locked
            </span>
          {/if}
        </div>
      </header>

      <!-- Team buttons -->
      <div class="flex gap-2">
        <button
          class="btn btn-neutral btn-accent-outline flex-1"
          style={teamVars(g.away)}
          aria-pressed={isSelected(g.id, 'away')}
          disabled={!canChange}
          on:click={() => selectTeam(g.id, 'away')}
        >
          <span class="font-semibold tracking-wide">{g.away}</span>
          <span class="check" aria-hidden="true"><Check size={14} /></span>
        </button>

        <!-- Home -->
        <button
          class="btn btn-neutral btn-accent-outline flex-1"
          style={teamVars(g.home)}
          aria-pressed={isSelected(g.id, 'home')}
          disabled={!canChange}
          on:click={() => selectTeam(g.id, 'home')}
        >
          <span class="font-semibold tracking-wide">{g.home}</span>
          <span class="check" aria-hidden="true"><Check size={14} /></span>
        </button>
      </div>

      <div class="mt-3 grid grid-cols-1 md:grid-cols-[1fr,auto] items-center gap-3">
        <!-- Weights -->
        <div class="min-w-0">
          <label class="text-xs block mb-1">Weight</label>

          <Segment
            name={'w_' + g.id}
            value={entry.selected?.weight ?? entry.lockedPick?.weight ?? 'L'}
            disabled={!canChange}
            onValueChange={(e) => setWeight(g.id, e.value as keyof typeof WEIGHTS)}
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

          {#if !canUseAce(g.id)}
            <p class="text-[11px] mt-1 opacity-70">
              {WEIGHTS.A.label} has already used on another game
            </p>
          {/if}
        </div>

        <div class="mt-3">
          {#if locked}
            <button
              class={`w-full h-10 font-semibold
              ${
                canUnlock
                  ? 'bg-warning-900 text-white hover:bg-warning-800'
                  : 'bg-surface-700 text-white opacity-50'
              }        
            `}
              on:click={() => onUnlock(g)}
              disabled={!canUnlock}
            >
              Unlock
            </button>

            {#if canUnlock}
              <p class="mt-1 text-[11px] text-center opacity-70">1 unlock remaining</p>
            {:else if (entry.unlocksUsed ?? 0) >= 1}
              <p class="mt-1 text-[11px] text-center opacity-70">0 unlock remaining</p>
            {/if}
          {:else}
            <button
              class="w-full h-10 font-semibold
             bg-success-900 text-white hover:bg-success-800
             disabled:bg-surface-400"
              on:click={() => onLock(g)}
              disabled={!entry.selected ||
                (entry.selected.weight === 'A' && !canUseAce(g.id)) ||
                started}
            >
              Lock Pick
            </button>
          {/if}
        </div>

        <!-- Post-kickoff notice -->
        {#if started}
          <p class="mt-2 text-xs opacity-70">Kickoff passed — picks locked.</p>
        {/if}
      </div>
    </article>
  {/each}
</div>
