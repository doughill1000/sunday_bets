<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { WeeklyGameBreakdown, WeeklyPickRow } from '$lib/types/leaderboard';

  let { game }: { game: WeeklyGameBreakdown } = $props();

  const scoreLabel = $derived(game.isFinal ? `${game.awayScore} – ${game.homeScore}` : null);

  // Within a team: the current user first, then by name.
  function sortMembers(a: WeeklyPickRow, b: WeeklyPickRow) {
    if (a.isYou) return -1;
    if (b.isYou) return 1;
    return a.displayName.localeCompare(b.displayName);
  }

  // Order team blocks away-then-home to match the "AWAY @ HOME" matchup title.
  function sideRank(side: WeeklyPickRow['pickedSide']) {
    return side === 'away' ? 0 : side === 'home' ? 1 : 2;
  }

  type TeamGroup = {
    side: WeeklyPickRow['pickedSide'];
    label: string;
    members: WeeklyPickRow[];
  };

  const picked = $derived(game.picks.filter((p) => p.pickedSide != null));
  // Players with no pick are only meaningful once picks are revealed (i.e. some pick is
  // visible, or the game is final). Pre-kickoff the view hides everyone's pick, so all rows
  // land here — in that case we suppress the list and show the reveal hint instead.
  const showNoPick = $derived(picked.length > 0 || game.isFinal);
  const noPick = $derived(
    showNoPick ? game.picks.filter((p) => p.pickedSide == null).toSorted(sortMembers) : []
  );

  const teams = $derived.by(() => {
    const groups: Record<string, TeamGroup> = {};
    for (const p of picked) {
      const key = p.pickedTeamShort ?? p.pickedSide ?? p.userId;
      const group = (groups[key] ??= {
        side: p.pickedSide,
        label: p.pickedTeamShort ?? '—',
        members: []
      });
      group.members.push(p);
    }
    const list = Object.values(groups);
    for (const group of list) group.members.sort(sortMembers);
    list.sort((a, b) => sideRank(a.side) - sideRank(b.side));
    return list;
  });

  type Outcome = WeeklyPickRow['outcome'];

  function teamRowClass(outcome: Outcome) {
    if (outcome === 'win') return 'bg-green-50 dark:bg-green-950/30';
    if (outcome === 'loss') return 'bg-red-50 dark:bg-red-950/30';
    return '';
  }

  function teamLabelClass(outcome: Outcome) {
    if (outcome === 'win') return 'text-green-700 dark:text-green-400';
    if (outcome === 'loss') return 'text-red-700 dark:text-red-400';
    if (outcome === 'push') return 'text-yellow-600 dark:text-yellow-400';
    return '';
  }
</script>

<Card class="shadow-sm">
  <CardHeader class="pb-2">
    <CardTitle class="text-base font-semibold">
      {game.away} @ {game.home}
      {#if scoreLabel}
        <span class="ml-2 text-sm font-normal text-muted-foreground">Final {scoreLabel}</span>
      {/if}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-1.5 pt-0">
    {#if picked.length === 0 && noPick.length === 0}
      <p class="text-sm text-muted-foreground">Picks reveal at kickoff.</p>
    {:else}
      {#each teams as team (team.label)}
        {@const outcome = team.members[0]?.outcome}
        <div class="flex gap-2 rounded px-1 {teamRowClass(outcome)}">
          <span class="mt-0.5 w-10 shrink-0 text-xs font-semibold {teamLabelClass(outcome)}">
            {team.label}
          </span>
          <ul class="flex flex-1 flex-wrap gap-x-2.5 gap-y-1">
            {#each team.members as p (p.userId)}
              <li class="flex items-center gap-1 text-xs">
                <UserAvatar size="xs" avatarKey={p.avatarKey} displayName={p.displayName} />
                <span
                  class="inline-block max-w-[140px] truncate align-bottom sm:max-w-[200px] {p.isYou
                    ? 'font-semibold'
                    : 'text-muted-foreground'}"
                >
                  {p.displayName}{p.isYou ? ' (you)' : ''}
                </span>
                <span
                  class="rounded bg-muted px-1 text-[10px] font-medium leading-tight text-muted-foreground"
                >
                  {p.weight ?? '—'}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    {/if}

    {#if noPick.length > 0}
      <div class="flex gap-2">
        <span class="mt-0.5 w-10 shrink-0 text-xs font-semibold text-muted-foreground">No pick</span
        >
        <ul class="flex flex-1 flex-wrap gap-x-2.5 gap-y-1">
          {#each noPick as p (p.userId)}
            <li class="flex items-center gap-1 text-xs">
              <UserAvatar size="xs" avatarKey={p.avatarKey} displayName={p.displayName} />
              <span
                class="inline-block max-w-[140px] truncate align-bottom sm:max-w-[200px] {p.isYou
                  ? 'font-semibold'
                  : 'text-muted-foreground'}"
              >
                {p.displayName}{p.isYou ? ' (you)' : ''}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </CardContent>
</Card>
