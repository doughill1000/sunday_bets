<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import WrappedCard from './WrappedCard.svelte';
  import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';
  import type { PlayerWrappedFacts, LeagueWrappedFacts } from '$lib/types/server/seasonWrapped';

  let { row }: { row: SeasonWrappedRow } = $props();

  type CardDef = { label: string; value: string; sub?: string; emoji?: string };

  const cards = $derived.by((): CardDef[] => {
    if (row.scope === 'player') {
      const f = row.facts as PlayerWrappedFacts;
      const result: CardDef[] = [];

      result.push({
        label: 'Season Rank',
        value: `#${f.rank}`,
        sub: `${f.total_points} pts`
      });

      result.push({
        label: 'Record',
        value: `${f.record.wins}-${f.record.losses}-${f.record.pushes}`
      });

      if (f.best_week) {
        result.push({
          label: 'Best Week',
          value: `Week ${f.best_week.week_number}`,
          sub: `${f.best_week.points} pts`
        });
      }

      if (f.allin) {
        result.push({
          label: 'All-In',
          value: `${f.allin.wins}-${f.allin.losses}-${f.allin.pushes}`
        });
      }

      if (f.contrarian_picks > 0) {
        result.push({
          label: 'Contrarian',
          value: `${f.contrarian_wins} wins`,
          sub: `of ${f.contrarian_picks}`
        });
      }

      if (f.nemesis) {
        result.push({
          label: 'Nemesis',
          value: f.nemesis.opponent.display_name,
          sub: `${f.nemesis.wins}-${f.nemesis.losses} vs them`
        });
      }

      for (const badge of f.badges) {
        result.push({
          label: badge.label,
          value: badge.label,
          emoji: badge.emoji
        });
      }

      return result;
    } else {
      const f = row.facts as LeagueWrappedFacts;
      const result: CardDef[] = [];

      if (f.champion) {
        result.push({
          label: 'Champion',
          value: f.champion.display_name,
          sub: `${f.champion.total_points} pts`,
          emoji: '🏆'
        });
      }

      if (f.wooden_spoon) {
        result.push({
          label: 'Wooden Spoon',
          value: f.wooden_spoon.display_name,
          sub: `${f.wooden_spoon.total_points} pts`,
          emoji: '🥄'
        });
      }

      result.push({
        label: 'Players',
        value: String(f.player_count)
      });

      return result;
    }
  });

  const leagueFacts = $derived(row.scope === 'league' ? (row.facts as LeagueWrappedFacts) : null);
</script>

<div data-testid="wrapped-story" class="space-y-6">
  <!-- Stat cards grid -->
  {#if cards.length > 0}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {#each cards as card (card.label)}
        <WrappedCard label={card.label} value={card.value} sub={card.sub} emoji={card.emoji} />
      {/each}
    </div>
  {/if}

  <!-- League-only: standings table -->
  {#if leagueFacts && leagueFacts.standings.length > 0}
    <div class="space-y-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Season Standings
      </h3>
      <div class="overflow-hidden rounded-lg border border-border">
        {#each leagueFacts.standings as entry (entry.user_id)}
          <div
            class="flex items-center justify-between border-b border-border/50 px-4 py-2 last:border-0"
          >
            <span class="text-sm text-muted-foreground">{entry.rank}.</span>
            <span class="flex-1 px-3 text-sm font-medium">{entry.display_name}</span>
            <span class="text-sm tabular-nums text-muted-foreground">{entry.total_points} pts</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- League-only: season title badges -->
  {#if leagueFacts && leagueFacts.title_badges.length > 0}
    <div class="space-y-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Season Titles
      </h3>
      <div class="space-y-1">
        {#each leagueFacts.title_badges as badge (badge.label)}
          <div class="flex items-start gap-2 text-sm">
            <span class="shrink-0">{badge.emoji} {badge.label}</span>
            <span class="text-muted-foreground">— {badge.holders.join(', ')}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- AI blurb -->
  <Card class="border-border/50 bg-card" data-testid="wrapped-blurb">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base font-semibold">
        <Sparkles class="h-4 w-4 shrink-0 text-primary" />
        Season Recap
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p class="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{row.prose}</p>
      {#if row.is_fallback}
        <p class="mt-2 text-xs italic text-muted-foreground">
          AI commentary unavailable — deterministic summary shown.
        </p>
      {/if}
    </CardContent>
  </Card>
</div>
