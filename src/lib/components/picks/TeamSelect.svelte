<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { selectTeam, usePicksStore } from '$lib/stores/picks';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    game: PickGame;
    canChange?: boolean;
  }

  let { game, canChange = false }: Props = $props();
  const picks = usePicksStore();

  const entry = $derived($picks[game.id] ?? {});
  const current = $derived(entry.selected ?? entry.lockedPick);
  const selAway = $derived(current?.team === 'away');
  const selHome = $derived(current?.team === 'home');
</script>

<div class="flex gap-2" role="group" aria-label="Pick a team" data-testid="team-select">
  <Button
    variant="secondary"
    class={`team-btn flex-1 ${selAway ? 'selected' : ''}`}
    aria-pressed={selAway}
    disabled={!canChange}
    onclick={() => selectTeam(game.id, 'away', picks)}
  >
    <span class="font-semibold tracking-wide">{game.away}</span>
  </Button>

  <Button
    variant="secondary"
    class={`team-btn flex-1 ${selHome ? 'selected' : ''}`}
    aria-pressed={selHome}
    disabled={!canChange}
    onclick={() => selectTeam(game.id, 'home', picks)}
  >
    <span class="font-semibold tracking-wide">{game.home}</span>
  </Button>
</div>
