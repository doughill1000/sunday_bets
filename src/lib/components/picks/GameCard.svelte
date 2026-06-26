<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { kickoffPassed } from '$lib/domain/rules';
  import { formatKickoff } from '$lib/ui/format';
  import { spreadLine, signedSpreadForTeam } from '$lib/domain/spread';
  import TeamSelect from './TeamSelect.svelte';
  import WeightSelect from './WeightSelect.svelte';
  import LockControls from './LockControls.svelte';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    game: PickGame;
    games?: PickGame[];
    initialized?: boolean;
    isLastWeek?: boolean;
    finalWeekUnlimitedAllin?: boolean;
  }
  let {
    game,
    games = [],
    initialized = false,
    isLastWeek = false,
    finalWeekUnlimitedAllin = true
  }: Props = $props();
  const picks = usePicksStore();

  const entry = $derived($picks[game.id] ?? {});
  const current = $derived(entry.selected ?? entry.lockedPick);
  const started = $derived(kickoffPassed(game.kickoff));
  const locked = $derived(!!entry.lockedPick);
  const canChange = $derived(initialized && !started && !locked);

  // Undefined when no weight is chosen yet, so no chip looks pre-selected.
  const weightValue = $derived(current?.weight);
  // A staged team with no weight is the "action needed" cue.
  const needsWeight = $derived(canChange && !!current?.team && !current?.weight);
  const lineText = $derived(spreadLine(game));
  const kickoffText = $derived(formatKickoff(game.kickoff));
</script>

<Card class="relative rounded-2xl" data-testid="game-card" data-game-id={game.id}>
  {#if locked}
    <Badge
      variant="secondary"
      class="absolute top-3 right-3 z-10 flex flex-col items-end px-2 py-1 text-[11px]"
    >
      <span>Locked</span>
      <span class="font-normal opacity-80">
        {#if entry.lockedPick}
          {entry.lockedPick.team === 'home' ? game.home : game.away}
          {signedSpreadForTeam(game, entry.lockedPick.team)}
          @ {entry.lockedPick.weight}
        {/if}
      </span>
    </Badge>
  {/if}

  <CardHeader class="flex-row items-center justify-between pb-2">
    <div class="min-w-0">
      <h2 class="truncate font-semibold">{game.away} @ {game.home}</h2>
      <p class="truncate text-xs text-muted-foreground">{lineText}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <time class="text-xs whitespace-nowrap text-muted-foreground" datetime={game.kickoff}>
        {kickoffText}
      </time>
    </div>
  </CardHeader>

  <CardContent class="space-y-3">
    <TeamSelect {game} {canChange} />

    <WeightSelect
      gameId={game.id}
      {games}
      {canChange}
      selectedWeight={weightValue}
      {isLastWeek}
      {finalWeekUnlimitedAllin}
    />

    {#if needsWeight}
      <p class="text-xs text-muted-foreground" data-testid="needs-weight-hint">
        Choose a weight to save.
      </p>
    {/if}

    <LockControls {game} {started} />

    {#if started}
      <p class="mt-2 text-xs text-muted-foreground">Kickoff passed — picks locked.</p>
    {/if}
  </CardContent>
</Card>
