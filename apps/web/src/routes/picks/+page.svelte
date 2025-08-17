<script lang="ts">
  import { Segment } from '@skeletonlabs/skeleton-svelte';

  type Weight = 'L' | 'M' | 'H' | 'A';
  type Game = {
    id: string;
    kickoff: string; // ISO
    away: string;
    home: string;
    spreadTeam: 'away' | 'home';
    spread: number; // positive = favored by N
  };
  type Pick = { team: 'away' | 'home'; weight: Weight };

  // Mock data (replace with real odds later)
  const games: Game[] = [
    { id: 'BUF@NYJ', kickoff: '2025-09-07T17:00:00Z', away: 'BUF', home: 'NYJ', spreadTeam: 'away', spread: 2.5 },
    { id: 'DAL@PHI', kickoff: '2025-09-07T20:25:00Z', away: 'DAL', home: 'PHI', spreadTeam: 'home', spread: 1.5 },
    { id: 'KC@CIN',  kickoff: '2025-09-07T20:25:00Z', away: 'KC',  home: 'CIN', spreadTeam: 'away', spread: 3.0 }
  ];

  let picks = $state<Record<string, Pick>>({}); // key: game.id

  // persist locally so you don't lose UI state while we build backend
  $effect(() => {
    try {
      const saved = localStorage.getItem('picks');
      if (saved) picks = JSON.parse(saved);
    } catch {}
  });
  $effect(() => {
    localStorage.setItem('picks', JSON.stringify(picks));
  });

  const weights: Weight[] = ['L', 'M', 'H', 'A'];

  function setTeam(gameId: string, team: 'away' | 'home') {
    const w = picks[gameId]?.weight ?? 'L';
    picks = { ...picks, [gameId]: { team, weight: w } };
  }
  function setWeight(gameId: string, weight: Weight) {
    const t = picks[gameId]?.team ?? 'home';
    picks = { ...picks, [gameId]: { team: t, weight } };
  }
</script>

<h1 class="h3 mb-4">This Week’s Games</h1>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {#each games as g}
    <article class="rounded-2xl p-4 border border-surface-600/20 bg-surface-500/5">
      <header class="flex items-center justify-between mb-2">
        <h2 class="font-semibold">{g.away} @ {g.home}</h2>
        <time class="text-xs opacity-70" datetime={g.kickoff}>
          {new Date(g.kickoff).toLocaleString()}
        </time>
      </header>

      <p class="text-sm mb-3 opacity-80">
        Line: {g.spreadTeam === 'away' ? g.away : g.home} {g.spread > 0 ? `-${g.spread}` : g.spread}
      </p>

      <div class="flex gap-2">
        <button
          class="btn preset-filled flex-1"
          aria-pressed={(picks[g.id]?.team ?? '') === 'away'}
          onclick={() => setTeam(g.id, 'away')}
        >
          {g.away}
        </button>
        <button
          class="btn preset-filled flex-1"
          aria-pressed={(picks[g.id]?.team ?? '') === 'home'}
          onclick={() => setTeam(g.id, 'home')}
        >
          {g.home}
        </button>
      </div>

      <div class="mt-3">
        <label class="text-xs block mb-1">Weight</label>
        <Segment
          name={"w_"+g.id}
          value={picks[g.id]?.weight ?? 'L'}
          onValueChange={(e) => setWeight(g.id, e.value as Weight)}
        >
          {#each weights as w}
            <Segment.Item value={w}>{w}</Segment.Item>
          {/each}
        </Segment>
      </div>
    </article>
  {/each}
</div>
