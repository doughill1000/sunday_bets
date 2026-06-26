<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { TEAM_META } from '$lib/types/domain';
  import { textOn, mute } from '$lib/ui/color';
  import { selectTeam, usePicksStore } from '$lib/stores/picks';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    game: PickGame;
    canChange?: boolean;
  }

  let { game, canChange = false }: Props = $props();
  const picks = usePicksStore();

  // Retain this fraction of each team color's saturation so the buttons read as
  // muted team tints rather than full-intensity gradients. Lower = calmer.
  const TEAM_SATURATION = 0.5;

  function teamVars(abbr: string) {
    const meta = TEAM_META[abbr] ?? {
      name: abbr,
      colors: ['#64748b', '#94a3b8'] as [string, string]
    };
    const c1 = mute(meta.colors[0], TEAM_SATURATION);
    const c2 = mute(meta.colors[1], TEAM_SATURATION);
    const fg = textOn(c1, c2);
    return `--c1:${c1};--c2:${c2};--fg:${fg}`;
  }

  const entry = $derived($picks[game.id] ?? {});
  const current = $derived(entry.selected ?? entry.lockedPick);
  const selAway = $derived(current?.team === 'away');
  const selHome = $derived(current?.team === 'home');

  const awayVars = $derived(teamVars(game.away));
  const homeVars = $derived(teamVars(game.home));
</script>

<div class="flex gap-2" role="group" aria-label="Pick a team" data-testid="team-select">
  <Button
    variant="secondary"
    class={`team-btn flex-1 ${selAway ? 'selected' : ''}`}
    style={awayVars}
    aria-pressed={selAway}
    disabled={!canChange}
    onclick={() => selectTeam(game.id, 'away', picks)}
  >
    <span class="font-semibold tracking-wide">{game.away}</span>
  </Button>

  <Button
    variant="secondary"
    class={`team-btn flex-1 ${selHome ? 'selected' : ''}`}
    style={homeVars}
    aria-pressed={selHome}
    disabled={!canChange}
    onclick={() => selectTeam(game.id, 'home', picks)}
  >
    <span class="font-semibold tracking-wide">{game.home}</span>
  </Button>
</div>
