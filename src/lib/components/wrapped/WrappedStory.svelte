<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import WrappedCard from './WrappedCard.svelte';
  import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';
  import type { PlayerWrappedFacts, LeagueWrappedFacts } from '$lib/types/server/seasonWrapped';

  let { row }: { row: SeasonWrappedRow } = $props();

  type CardDef = { label: string; value: string; sub?: string; emoji?: string };

  const playerFacts = $derived(row.scope === 'player' ? (row.facts as PlayerWrappedFacts) : null);
  const leagueFacts = $derived(row.scope === 'league' ? (row.facts as LeagueWrappedFacts) : null);

  // Numeric stat cards only. Badges are a celebratory moment, not a metric, so they render in
  // their own emoji-forward showcase below rather than as stat cards whose value duplicates
  // the label.
  const cards = $derived.by((): CardDef[] => {
    if (playerFacts) {
      const f = playerFacts;
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

      return result;
    } else if (leagueFacts) {
      const f = leagueFacts;
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
    return [];
  });
</script>

<div data-testid="wrapped-story" class="space-y-6">
  <!-- Stat cards grid (numbers only) -->
  {#if cards.length > 0}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {#each cards as card (card.label)}
        <WrappedCard label={card.label} value={card.value} sub={card.sub} emoji={card.emoji} />
      {/each}
    </div>
  {/if}

  <!-- Player-only: badge showcase. Emoji-forward medallions, distinct from the stat grid —
       the celebratory counterpart to the Group honors ledger. -->
  {#if playerFacts && playerFacts.badges.length > 0}
    <div class="space-y-3" data-testid="wrapped-badges">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your Badges
      </h3>
      <ul class="flex flex-wrap gap-3">
        {#each playerFacts.badges as badge (badge.id)}
          <li
            class="flex w-24 flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card px-2 py-3 text-center"
            data-testid="wrapped-badge-{badge.id}"
            title={badge.label}
          >
            <span class="text-3xl leading-none" aria-hidden="true">{badge.emoji}</span>
            <span class="text-xs font-medium leading-tight">{badge.label}</span>
          </li>
        {/each}
      </ul>
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

  <!-- AI blurb — placed above the standings table so the recap isn't buried at the bottom. -->
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

  <!-- League-only: full season standings. Last — it's the reference table, after the
       celebratory cards, titles, and recap. -->
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
</div>
