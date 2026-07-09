<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { kickoffPassed } from '$lib/domain/rules';
  import { formatKickoff } from '$lib/ui/format';
  import { spreadLine, signedSpreadForTeam } from '$lib/domain/spread';
  import { nuggetForSide } from '$lib/utils/leagueNugget';
  import TeamSelect from './TeamSelect.svelte';
  import WeightSelect from './WeightSelect.svelte';
  import LockControls from './LockControls.svelte';
  import type { PickGame } from '$lib/types/games';
  import type { LeagueSituationalRecord } from '$lib/types/server/league';

  interface Props {
    game: PickGame;
    games?: PickGame[];
    initialized?: boolean;
    isLastWeek?: boolean;
    finalWeekUnlimitedAllin?: boolean;
    /** Season situational ATS lookup for the trend nugget; null when the user has it off. */
    trendLookup?: Map<string, LeagueSituationalRecord> | null;
  }
  let {
    game,
    games = [],
    initialized = false,
    isLastWeek = false,
    finalWeekUnlimitedAllin = true,
    trendLookup = null
  }: Props = $props();
  const picks = usePicksStore();

  const entry = $derived($picks[game.id] ?? {});
  const current = $derived(entry.selected ?? entry.lockedPick);
  const started = $derived(kickoffPassed(game.kickoff));
  const locked = $derived(!!entry.lockedPick);
  const canChange = $derived(initialized && !started && !locked);

  // Undefined when no weight is chosen yet, so no chip looks pre-selected.
  const weightValue = $derived(current?.weight);
  const lineText = $derived(spreadLine(game));
  const kickoffText = $derived(formatKickoff(game.kickoff));

  // Situational ATS nuggets, away then home to match the "{away} @ {home}" title order.
  // Each is null when trends are off, the game is a pick'em/no-line, or the quadrant is
  // below the sample threshold — so nothing renders and the card keeps its height.
  const awayNugget = $derived(trendLookup ? nuggetForSide(game, 'away', trendLookup) : null);
  const homeNugget = $derived(trendLookup ? nuggetForSide(game, 'home', trendLookup) : null);
</script>

<Card class="relative gap-3 rounded-2xl" data-testid="game-card" data-game-id={game.id}>
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

  <CardHeader class="grid-cols-[1fr_auto] items-start gap-x-3">
    <div class="min-w-0 space-y-0.5">
      <h2 class="truncate font-semibold text-foreground">{game.away} @ {game.home}</h2>
      <p class="truncate text-sm font-medium text-foreground/70">{lineText}</p>
      <time class="block text-xs font-medium text-foreground/60" datetime={game.kickoff}>
        {kickoffText}
      </time>
    </div>
    {#if awayNugget || homeNugget}
      <div class="col-start-2 max-w-[10rem] space-y-0.5 text-right" data-testid="ats-nugget">
        {#if awayNugget}
          <p class="text-[11px] leading-tight text-foreground/70">
            {game.away}: {awayNugget.record} as {awayNugget.role}
          </p>
        {/if}
        {#if homeNugget}
          <p class="text-[11px] leading-tight text-foreground/70">
            {game.home}: {homeNugget.record} as {homeNugget.role}
          </p>
        {/if}
      </div>
    {/if}
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

    <LockControls {game} {started} />

    {#if started}
      <p class="mt-2 text-xs text-muted-foreground">Kickoff passed — picks locked.</p>
    {/if}
  </CardContent>
</Card>
