<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { TEAM_META } from '$lib/types/domain';
  import { textOn } from '$lib/ui/color';
  import { picks, selectTeam } from '$lib/stores/picks';
  import type { UIGame } from '$lib/types/ui';

  export let game: UIGame;
  export let canChange = false;

  function teamVars(abbr: string) {
    const meta = TEAM_META[abbr] ?? {
      name: abbr,
      colors: ['#64748b', '#94a3b8'] as [string, string]
    };
    const [c1, c2] = meta.colors;
    const fg = textOn(c1, c2);
    return `--c1:${c1};--c2:${c2};--fg:${fg}`;
  }

  $: entry = $picks[game.id] ?? {};
  $: current = entry.selected ?? entry.lockedPick;
  $: selAway = current?.team === 'away';
  $: selHome = current?.team === 'home';

  $: awayVars = teamVars(game.away);
  $: homeVars = teamVars(game.home);
</script>

<div class="flex gap-2" role="group" aria-label="Pick a team">
  <Button
    variant="secondary"
    class={`team-btn flex-1 ${selAway ? 'selected' : ''}`}
    style={awayVars}
    aria-pressed={selAway}
    disabled={!canChange}
    onclick={() => selectTeam(game.id, 'away')}
  >
    <span class="font-semibold tracking-wide">{game.away}</span>
  </Button>

  <Button
    variant="secondary"
    class={`team-btn flex-1 ${selHome ? 'selected' : ''}`}
    style={homeVars}
    aria-pressed={selHome}
    disabled={!canChange}
    onclick={() => selectTeam(game.id, 'home')}
  >
    <span class="font-semibold tracking-wide">{game.home}</span>
  </Button>
</div>

<style>
  :global(.team-btn) {
    --c1: #64748b;
    --c2: #94a3b8;
    --fg: #000;
    background: linear-gradient(135deg, var(--c1), var(--c2));
    color: var(--fg);
    border: 1px solid hsl(var(--border));
  }
  :global(.team-btn.selected) {
    outline: 2px solid white;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--c1) 60%, white 40%) inset;
  }
</style>
