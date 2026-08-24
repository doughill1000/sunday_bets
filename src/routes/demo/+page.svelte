<script lang="ts">
  import type { PageData } from './$types';
  import PicksBoard from '$lib/components/picks/PicksBoard.svelte';
  import type { PickEntry } from '$lib/types/picks';

  let { data }: { data: PageData } = $props();

  // The demo renders the real, interactive PicksBoard in its `readonly` mode (#669, ADR-0026)
  // rather than a hand-mirrored board — reshaping the frozen `DemoLiveWeek` into the same props
  // an authed board reads: `personaPick` becomes a seeded `lockedPick`, and `status !== 'open'`
  // replaces the kickoff-vs-now split so the grouping can't drift once the snapshot's real
  // kickoff timestamps age into the past.
  //
  // Since #832 that split is the kickoff boundary: a started game leaves the board for the
  // handoff strip, which points at the demo's own frozen `/demo/week`. The frozen live scores
  // the board used to take went with the sweat layer.
  //
  // What did NOT go with it is the All-In reveal (#844): ADR-0023 reveals a locked All-In
  // pre-kickoff, which puts it on this side of the boundary. The snapshot seeds one on the game
  // that has not started, so a first-time visitor meets the signature moment on the board where
  // they can still answer it.
  const initialPicks = $derived(
    Object.fromEntries(
      data.liveWeek.games
        .filter((g) => g.personaPick != null)
        .map((g) => [
          g.id,
          {
            lockedPick: { team: g.personaPick!.side, weight: g.personaPick!.weight }
          } satisfies PickEntry
        ])
    )
  );

  const committedGameIds = $derived(
    new Set(data.liveWeek.games.filter((g) => g.status !== 'open').map((g) => g.id))
  );
</script>

<PicksBoard
  games={data.liveWeek.games}
  {initialPicks}
  allInDeclarations={data.liveWeek.allIns}
  userId={data.personaUserId}
  readonly
  weekHref="/demo/week"
  {committedGameIds}
/>
