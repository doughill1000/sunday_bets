<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import { liveCoverState, type CoverVerdict, type LiveCoverState } from '$lib/domain/liveCover';
  import { verdictTextClass, verdictDotClass, verdictAria, fmtPoints } from '$lib/live/display';
  import type { LiveScoreEntry } from '$lib/live/types';
  import type { WeeklyGameBreakdown, WeeklyPickRow } from '$lib/types/leaderboard';

  interface Props {
    game: WeeklyGameBreakdown;
    /** Live sweat board (#584): this game's live/final ESPN score, or null. Display-only. */
    liveScore?: LiveScoreEntry | null;
    /** Feed gone stale — stop asserting a live verdict (mirrors #386's group-dot behaviour). */
    liveStale?: boolean;
  }
  let { game, liveScore = null, liveStale = false }: Props = $props();

  // Graded is authoritative: once any pick on this game has a settled points_delta, the grade
  // cron has run and the live overlay yields to the settled win/loss colouring below.
  const isGraded = $derived(game.picks.some((p) => p.pointsDelta != null));

  // "Live-lit" = we have a fresh ESPN score for an ungraded game — either in progress or
  // final-but-not-yet-graded. A stale feed drops back to the static look rather than freezing a
  // number.
  const liveLit = $derived(liveScore != null && !liveStale && !isGraded);
  const inProgress = $derived(liveLit && liveScore?.status === 'in_progress');
  const finalUnofficial = $derived(liveLit && liveScore?.status === 'final');

  const scoreLabel = $derived(game.isFinal ? `${game.awayScore} – ${game.homeScore}` : null);
  const liveScoreLabel = $derived(
    liveScore ? `${liveScore.awayScore} – ${liveScore.homeScore}` : null
  );
  const clockLabel = $derived.by(() => {
    if (!liveScore) return null;
    const q = liveScore.period ? `Q${liveScore.period}` : '';
    return liveScore.displayClock ? [q, liveScore.displayClock].filter(Boolean).join(' · ') : q;
  });

  // Live cover state for one pick, mirroring grade_pick against the live score (display-only).
  function coverStateOf(p: WeeklyPickRow): LiveCoverState | null {
    if (!liveLit || !liveScore) return null;
    return liveCoverState({
      homeScore: liveScore.homeScore,
      awayScore: liveScore.awayScore,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      pickedTeamId: p.pickedTeamId,
      lockedSpreadTeamId: p.lockedSpreadTeamId,
      lockedSpreadValue: p.lockedSpreadValue
    });
  }
  function coverVerdictOf(p: WeeklyPickRow): CoverVerdict | null {
    return coverStateOf(p)?.verdict ?? null;
  }

  // Compact cushion for the team label's second line; colour already conveys covering vs not.
  function cushionText(state: LiveCoverState): string {
    if (state.verdict === 'push') return 'Push';
    const n = fmtPoints(Math.abs(state.cushion));
    return state.verdict === 'covering' ? `+${n}` : `−${n}`;
  }

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

  // Graded (settled) team colouring.
  function teamRowClass(outcome: Outcome) {
    if (outcome === 'win') return 'bg-success/10';
    if (outcome === 'loss') return 'bg-destructive/10';
    return '';
  }
  function teamLabelClass(outcome: Outcome) {
    if (outcome === 'win') return 'text-success';
    if (outcome === 'loss') return 'text-destructive';
    if (outcome === 'push') return 'text-warning';
    return '';
  }

  // Live (unofficial) team colouring — same verdict tokens the picks board uses.
  function verdictRowClass(v: CoverVerdict) {
    if (v === 'covering') return 'bg-success/10';
    if (v === 'not_covering') return 'bg-destructive/10';
    return 'bg-warning/10';
  }
</script>

<Card>
  <CardHeader class="pb-2">
    <CardTitle class="flex flex-wrap items-center gap-2 text-base font-semibold">
      <span>{game.away} @ {game.home}</span>
      {#if inProgress}
        <span class="inline-flex items-center gap-1 text-sm font-normal" data-testid="live-score">
          <span class="size-1.5 animate-pulse rounded-full bg-destructive" aria-hidden="true"
          ></span>
          <span class="tabular-nums">{liveScoreLabel}</span>
          {#if clockLabel}
            <span class="text-xs text-muted-foreground">{clockLabel}</span>
          {/if}
        </span>
      {:else if finalUnofficial}
        <span class="inline-flex items-center gap-1.5 text-sm font-normal">
          <span class="tabular-nums">{liveScoreLabel}</span>
          <span class="text-xs font-medium text-warning" data-testid="final-unofficial"
            >Final — unofficial</span
          >
        </span>
      {:else if scoreLabel}
        <span class="text-sm font-normal text-muted-foreground">Final {scoreLabel}</span>
      {/if}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-1.5 pt-0">
    {#if picked.length === 0 && noPick.length === 0}
      <p class="text-sm text-muted-foreground">Picks reveal at kickoff.</p>
    {:else}
      {#each teams as team (team.label)}
        {@const first = team.members[0]}
        {@const liveState = liveLit ? coverStateOf(first) : null}
        {@const outcome = first?.outcome}
        {@const rowClass = liveState ? verdictRowClass(liveState.verdict) : teamRowClass(outcome)}
        {@const labelClass = liveState
          ? verdictTextClass(liveState.verdict)
          : teamLabelClass(outcome)}
        <div class="flex gap-2 rounded px-1 {rowClass}">
          <span class="mt-0.5 w-12 shrink-0 text-xs font-semibold {labelClass}">
            <span class="block leading-tight">{team.label}</span>
            {#if liveState}
              <span class="block text-[10px] font-medium tabular-nums" data-testid="cover-cushion"
                >{cushionText(liveState)}</span
              >
            {/if}
          </span>
          <ul class="flex flex-1 flex-wrap gap-x-2.5 gap-y-1">
            {#each team.members as p (p.userId)}
              {@const verdict = coverVerdictOf(p)}
              <li class="flex items-center gap-1 text-xs">
                {#if verdict}
                  <span
                    class="size-1.5 shrink-0 rounded-full {verdictDotClass(verdict)}"
                    title={verdictAria(verdict)}
                    aria-label={verdictAria(verdict)}
                    data-testid="member-cover-dot"
                  ></span>
                {/if}
                <UserAvatar size="xs" avatarKey={p.avatarKey} displayName={p.displayName} />
                <span
                  class="inline-block max-w-[140px] truncate align-bottom sm:max-w-[200px] {p.isYou
                    ? 'font-semibold'
                    : 'text-muted-foreground'}"
                >
                  {p.displayName}{p.isYou ? ' (you)' : ''}
                </span>
                <span
                  class="rounded bg-muted px-1 text-[10px] leading-tight font-medium text-muted-foreground"
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
        <span class="mt-0.5 w-12 shrink-0 text-xs font-semibold text-muted-foreground">No pick</span
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
