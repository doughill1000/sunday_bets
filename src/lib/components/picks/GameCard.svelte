<script lang="ts">
  import { picks } from '$lib/stores/picks';
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
    initialized?: boolean;
  }
  let { game, initialized = false }: Props = $props();

  const entry = $derived($picks[game.id] ?? {});
  const current = $derived(entry.selected ?? entry.lockedPick);
  const started = $derived(kickoffPassed(game.kickoff));
  const locked = $derived(!!entry.lockedPick);
  const canChange = $derived(initialized && !started && !locked);

  const weightValue = $derived(current?.weight ?? 'L');
  const lineText = $derived(spreadLine(game));
  const kickoffText = $derived(formatKickoff(game.kickoff));
</script>

<Card class="relative rounded-2xl">
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

    <WeightSelect gameId={game.id} {canChange} selectedWeight={weightValue} />

    <LockControls {game} {initialized} {started} {locked} />

    {#if started}
      <p class="mt-2 text-xs text-muted-foreground">Kickoff passed — picks locked.</p>
    {/if}
  </CardContent>
</Card>
