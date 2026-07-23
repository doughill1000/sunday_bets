<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import type { Snippet } from 'svelte';
  import type { WeeklyAward, WeeklyHardware } from '$lib/domain/weeklyAwards';

  let {
    hardware,
    currentUserId = null,
    recapHref = null,
    recapLabel = null,
    legend
  }: {
    hardware: WeeklyHardware;
    currentUserId?: string | null;
    /** When set, a link out to the week's story renders under the tiles (#631). The League
     *  Week tab passes it so the recap is one tap away without inlining a RecapCard; the
     *  Season recaps archive leaves it null because the card already sits right below. */
    recapHref?: string | null;
    recapLabel?: string | null;
    /** Optional legend trigger rendered in the card header, top-right of the title (#780). The
     *  Week tab shows a single hardware card, so its weekly-hardware legend sits on the card it
     *  explains; the recap archive repeats a card per week and keeps one legend up top instead,
     *  so it leaves this unset. */
    legend?: Snippet;
  } = $props();

  const fmt = (n: number) => String(Number(n));

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }

  /** Award-specific one-line stat under the holder. */
  function detailText(a: WeeklyAward): string {
    switch (a.id) {
      case 'game-ball':
      case 'donkey-of-week':
        return `${a.points > 0 ? '+' : ''}${a.points} pts`;
      case 'bad-beat':
        return `lost by ${fmt(Math.abs(a.cover_margin))}`;
      case 'backdoor':
        return `won by ${fmt(a.cover_margin)}`;
      case 'contrarian-win':
        return `${fmt(a.consensus_pct)}% took it`;
    }
  }
</script>

<Card class="border-border/50 bg-card">
  <CardHeader class="pb-2">
    <div class="flex items-center justify-between gap-2">
      <CardTitle class="flex items-center gap-2 text-base font-semibold">
        <Trophy class="h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
        Week {hardware.week_number} hardware
      </CardTitle>
      {@render legend?.()}
    </div>
  </CardHeader>
  <CardContent class="space-y-3">
    <ul class="grid grid-cols-2 gap-2" data-testid="weekly-hardware">
      {#each hardware.awards as award (award.id)}
        <!-- No `title=` here: a hover tooltip is not a mechanism a phone has (ADR-0030), and it
             hid the flavour text from every mobile reader. The Awards legend, mounted by each
             surface that renders these tiles, is now the one place the descriptions live (#771). -->
        <li
          class="flex flex-col gap-0.5 rounded-lg border bg-muted/40 p-2.5"
          data-testid="weekly-award-{award.id}"
        >
          <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span aria-hidden="true">{award.emoji}</span>
            {award.short}
          </span>
          <!-- Co-winners stack one name per line (#770): the tie exists to be seen, so every
               holder stays visible and only an over-long name truncates. A lone holder renders
               exactly as it always did, and the grid stretches sibling tiles to match. -->
          {#each award.holders as holder (holder.user_id)}
            <span class="truncate text-sm font-semibold" data-testid="weekly-award-holder">
              {nameFor(holder.user_id, holder.display_name)}
            </span>
          {/each}
          <span class="text-xs text-muted-foreground tabular-nums">{detailText(award)}</span>
        </li>
      {/each}
    </ul>

    {#if recapHref}
      <a
        href={recapHref}
        data-testid="weekly-hardware-recap-link"
        class="flex items-center gap-2 rounded-lg border border-primary-ink/30 bg-primary/5 px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10"
      >
        <Sparkles class="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
        <span class="flex-1">{recapLabel ?? 'Season recaps'}</span>
        <ArrowRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </a>
    {/if}
  </CardContent>
</Card>
