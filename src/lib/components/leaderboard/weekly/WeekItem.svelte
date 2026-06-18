<!-- src/lib/components/leaderboard/weekly/WeekItem.svelte -->
<script lang="ts">
  import { AccordionItem, AccordionTrigger, AccordionContent } from '$lib/components/ui/accordion';
  import WeekHeader from './WeekHeader.svelte';
  import GameGrid from './GameGrid.svelte';
  import type {
    LeaderboardPickCell,
    LeaderboardPlayer,
    WeeklyLeaderboardGame
  } from '$lib/types/leaderboard';

  interface Props {
    weekNumber: number;
    players?: LeaderboardPlayer[];
    weekTotals?: Record<string, number>; // per user
    games?: WeeklyLeaderboardGame[];
    cells?: Record<string, Record<string, LeaderboardPickCell>>;
    gridTemplate: string;
    gridTemplateLg: string;
    activeWeekNumber?: number | null;
  }
  let {
    weekNumber,
    players = [],
    weekTotals = {},
    games = [],
    cells = {},
    gridTemplate,
    gridTemplateLg,
    activeWeekNumber = null
  }: Props = $props();
</script>

<AccordionItem value={`week-${weekNumber}`} class="border-b">
  <AccordionTrigger class="justify-start">
    <WeekHeader {weekNumber} {players} totals={weekTotals} {activeWeekNumber} />
  </AccordionTrigger>

  <AccordionContent>
    <GameGrid {players} {games} {cells} {gridTemplate} {gridTemplateLg} />
  </AccordionContent>
</AccordionItem>
