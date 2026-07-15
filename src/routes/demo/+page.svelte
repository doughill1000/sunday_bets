<script lang="ts">
  import type { PageData } from './$types';
  import PicksBoard from '$lib/components/picks/PicksBoard.svelte';
  import type { PickEntry, GroupPickEntry } from '$lib/types/picks';
  import type { LiveScoreEntry } from '$lib/live/types';

  let { data }: { data: PageData } = $props();

  // The demo renders the real, interactive PicksBoard in its `readonly` mode (#669, ADR-0026)
  // rather than a hand-mirrored board — reshaping the frozen `DemoLiveWeek` into the same props
  // an authed board reads from live queries: `personaPick` becomes a seeded `lockedPick`, each
  // game's own frozen `liveScore` replaces the live-scores poll (never issued in readonly mode),
  // and `status !== 'open'` replaces the kickoff-vs-now split so the grouping can't drift once
  // the snapshot's real kickoff timestamps age into the past.
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

  const groupPicks = $derived(data.liveWeek.games.flatMap((g) => g.groupPicks) as GroupPickEntry[]);

  const frozenLiveScores = $derived(
    Object.fromEntries(
      data.liveWeek.games
        .filter((g): g is typeof g & { liveScore: LiveScoreEntry } => g.liveScore != null)
        .map((g) => [g.id, g.liveScore])
    )
  );

  const committedGameIds = $derived(
    new Set(data.liveWeek.games.filter((g) => g.status !== 'open').map((g) => g.id))
  );
</script>

<PicksBoard
  games={data.liveWeek.games}
  {initialPicks}
  {groupPicks}
  userId={data.personaUserId}
  currentUserDisplayName={data.personaName}
  readonly
  {frozenLiveScores}
  {committedGameIds}
/>
