<script lang="ts">
  // Test-only harness: provides the QueryClient context PicksBoard's live-scores query needs.
  // The test seeds `['live-scores']` in the client BEFORE rendering, which reproduces the #822
  // state exactly — a cached payload already in hand when the live window closes.
  //
  // The readonly/frozen props mirror the public demo (ADR-0026), where there is no live window
  // at all and the snapshot IS the feed — the case the window gate must not break.
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import PicksBoard from '../PicksBoard.svelte';
  import type { PickGame } from '$lib/types/games';
  import type { PickEntry } from '$lib/types/picks';
  import type { LiveScoreEntry } from '$lib/live/types';

  let {
    client,
    games,
    initialPicks,
    readonly = false,
    frozenLiveScores = {},
    committedGameIds = new Set<string>()
  }: {
    client: QueryClient;
    games: PickGame[];
    initialPicks: Record<string, PickEntry>;
    readonly?: boolean;
    frozenLiveScores?: Record<string, LiveScoreEntry>;
    committedGameIds?: ReadonlySet<string>;
  } = $props();
</script>

<QueryClientProvider {client}>
  <PicksBoard {games} {initialPicks} userId="u1" {readonly} {frozenLiveScores} {committedGameIds} />
</QueryClientProvider>
