<script lang="ts">
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
  } from '$lib/components/ui/accordion';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  type Result = 'W' | 'L' | 'P' | 'M';
  type Weight = 'L' | 'M' | 'H' | 'A' | number;

  export let seasonYear: number;
  export let players: { id: string; display_name: string }[] = [];
  export let weeks: number[] = [];
  export let data: Record<
    number,
    Record<
      string,
      { week_points: number; picks: Array<{ weight: Weight; team: string; result: Result, spread: string }> }
    >
  > = {};

  function resultClass(r: Result) {
    switch (r) {
      case 'W':
        return 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/20';
      case 'L':
        return 'bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/20';
      case 'P':
        return 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20';
      case 'M':
        return 'bg-zinc-500/10 text-zinc-700 ring-1 ring-zinc-500/20';
    }
  }
  const chipBase =
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
</script>

<Card class="mx-auto w-full shadow-sm">
  <CardHeader>
    <CardTitle class="text-xl">Weekly Progress — Season {seasonYear}</CardTitle>
  </CardHeader>

  <CardContent class="space-y-2">
   <Accordion type="multiple" class="w-full">
  {#each weeks as wk (wk)}
    <AccordionItem value={`week-${wk}`} class="border-b">
      <AccordionTrigger class="justify-start">
        <span class="font-medium">Week {wk}</span>
      </AccordionTrigger>

      <AccordionContent>
        <div class="overflow-x-auto">
          <div
            class="grid gap-3 items-start"
            style={`grid-template-columns: 220px repeat(${players.length}, minmax(180px, 1fr));`}
          >
            <!-- Header -->
            <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Game</div>
            {#each players as p}
              <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {p.display_name}
              </div>
            {/each}

            <!-- Rows: one per game -->
            {#each data.tableByWeek[wk].games as g}
              <!-- Left: game label + score -->
              <div class="rounded-md border p-3">
                <div class="font-medium">{g.label}</div>
                <div class="text-sm text-muted-foreground">
                  {g.score ?? '—'}
                </div>
              </div>

              <!-- Player cells -->
              {#each players as p}
                {#if data.tableByWeek[wk].cells[g.game_id]?.[p.id]}
                  {#let cell = data.tableByWeek[wk].cells[g.game_id][p.id]}
                    <div class="rounded-md border p-3">
                      {#if cell.team}
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2">
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ring-zinc-200 bg-zinc-50 text-zinc-700">
                              {cell.weight}
                            </span>
                            <div class="leading-tight">
                              <div class="font-medium">{cell.team}</div>
                              {#if cell.spread}<div class="text-xs text-muted-foreground">{cell.spread}</div>{/if}
                            </div>
                          </div>
                          {#if cell.result}
                            <span class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                              ${cell.result === 'W' ? 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/20' :
                                 cell.result === 'L' ? 'bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/20' :
                                 cell.result === 'P' ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20' :
                                                       'bg-zinc-500/10 text-zinc-700 ring-1 ring-zinc-500/20'}`}>
                              {cell.result}
                            </span>
                          {/if}
                        </div>
                      {:else}
                        <div class="text-sm text-muted-foreground">—</div>
                      {/if}
                    </div>
                  {/let}
                {:else}
                  <div class="rounded-md border p-3 text-sm text-muted-foreground">—</div>
                {/if}
              {/each}
            {/each}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  {/each}
</Accordion>
  </CardContent>
</Card>
