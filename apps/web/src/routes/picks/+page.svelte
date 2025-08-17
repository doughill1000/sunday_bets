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

  // ----- Types -----
  type Weight = 'L' | 'M' | 'H' | 'A';
  type Game = {
    id: string;
    kickoff: string; // ISO
    away: string;
    home: string;
    spreadTeam: 'away' | 'home';
    spread: number;
  };

  // ----- Mock data (replace via API later) -----
  const games: Game[] = [
    {
      id: 'BUF@NYJ',
      kickoff: '2025-09-07T17:00:00Z',
      away: 'BUF',
      home: 'NYJ',
      spreadTeam: 'away',
      spread: 2.5
    },
    {
      id: 'DAL@PHI',
      kickoff: '2025-09-07T20:25:00Z',
      away: 'DAL',
      home: 'PHI',
      spreadTeam: 'home',
      spread: 1.5
    },
    {
      id: 'KC@CIN',
      kickoff: '2025-09-07T20:25:00Z',
      away: 'KC',
      home: 'CIN',
      spreadTeam: 'away',
      spread: 3.0
    }
  ];

  const weights: Weight[] = ['L', 'M', 'H', 'A'];

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
          <p class="text-xs opacity-70 truncate" title={`${team(g.away)} @ ${team(g.home)}`}>
            Line: {g.spreadTeam === 'away' ? g.away : g.home}
            {g.spread > 0 ? `-${g.spread}` : g.spread}
          </p>
        </div>
        <time
          class="text-xs opacity-70 whitespace-nowrap"
          datetime={g.kickoff}
          title={new Date(g.kickoff).toUTCString()}
        >
          {formatKickoff(g.kickoff)}
        </time>
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

      <!-- Weight & status -->
      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <label class="text-xs block mb-1">Weight</label>
          <Segment
            name={'w_' + g.id}
            value={entry.selected?.weight ?? entry.lockedPick?.weight ?? 'L'}
            disabled={!canChange}
            onValueChange={(e) => setWeight(g.id, e.value as Weight)}
          >
            {#each weights as w}
              <Segment.Item value={w} disabled={w === 'A' && !canUseAce(g.id)}>{w}</Segment.Item>
            {/each}
          </Segment>
          {#if entry.lockedPick?.weight === 'A'}
            <p class="text-[11px] mt-1 opacity-70">A used here</p>
          {:else if !canUseAce(g.id)}
            <p class="text-[11px] mt-1 opacity-70">A already used on another game</p>
          {/if}
        </div>

        <!-- Lock/Unlock -->
        <div class="flex flex-col items-end gap-2">
          {#if locked}
            <span class="text-xs px-2 py-1 rounded-full bg-green-600/20 text-green-600">
              Locked
            </span>
            {#if canUnlock}
              <button class="btn preset-tonal text-xs" on:click={() => onUnlock(g)}>Unlock</button>
            {:else}
              <button class="btn preset-tonal text-xs" disabled>Unlock</button>
            {/if}
          {:else}
            <button
              class="btn preset-filled"
              on:click={() => onLock(g)}
              disabled={!entry.selected ||
                (entry.selected.weight === 'A' && !canUseAce(g.id)) ||
                started}
            >
              Lock Pick
            </button>
          {/if}
        </div>
      </div>

      <!-- Post-kickoff notice -->
      {#if started}
        <p class="mt-2 text-xs opacity-70">Kickoff passed — picks locked.</p>
      {/if}
    </article>
  {/each}
</div>
