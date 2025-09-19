<!-- src/lib/components/leaderboard/weekly/WeekItem.svelte -->
<script lang="ts">
  import { AccordionItem, AccordionTrigger, AccordionContent } from '$lib/components/ui/accordion';
  import WeekHeader from './WeekHeader.svelte';
  import GameGrid from './GameGrid.svelte';
  import type { PickCell, PlayerRow, WeekTableGame } from '$lib/types/server/leaderboard';

  export let weekNumber: number;
  export let players: PlayerRow[] = [];
  export let weekTotals: Record<string, number> = {}; // per user
  export let games: WeekTableGame[] = [];
  export let cells: Record<string, Record<string, PickCell>> = {};
  export let gridTemplate: string;
  export let gridTemplateLg: string;
</script>

<AccordionItem value={`week-${weekNumber}`} class="border-b">
  <AccordionTrigger class="justify-start">
    <WeekHeader {weekNumber} {players} totals={weekTotals} />
  </AccordionTrigger>

  <AccordionContent>
    <GameGrid {players} {games} {cells} {gridTemplate} {gridTemplateLg} />
  </AccordionContent>
</AccordionItem>
