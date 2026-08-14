<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import { liveCoverState, type CoverVerdict, type LiveCoverState } from '$lib/domain/liveCover';
  import { verdictTextClass, verdictDotClass, verdictAria, fmtPoints } from '$lib/live/display';
  import { gameCover, spreadLine } from '$lib/domain/spread';
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

  // The game's line, as context for what the picks were played against (#836). Rendered through
  // the shared ADR-0007 formatter so /week and /picks print the convention identically. `null`
  // when the game has no line — an unlined game was never pickable (#802/#803), so the header
  // stays exactly as it is today rather than showing a placeholder that reads as an error.
  const lineLabel = $derived(game.spreadValue == null ? null : spreadLine(game));

  // --- The header's result column (#838) ------------------------------------------------------
  // One score, one source. The live feed owns the number while the game is live-lit; the settled
  // final owns it otherwise. `null` before kickoff, and on an ungraded game whose feed went stale
  // — the same "stop asserting" rule the per-member cover dots follow.
  const shownScore = $derived.by(() => {
    if (liveLit && liveScore) return { home: liveScore.homeScore, away: liveScore.awayScore };
    if (game.isFinal && game.homeScore != null && game.awayScore != null) {
      return { home: game.homeScore, away: game.awayScore };
    }
    return null;
  });
  const scoreLabel = $derived(shownScore ? `${shownScore.away} – ${shownScore.home}` : null);

  const clockLabel = $derived.by(() => {
    if (!liveScore) return null;
    const q = liveScore.period ? `Q${liveScore.period}` : '';
    return liveScore.displayClock ? [q, liveScore.displayClock].filter(Boolean).join(' · ') : q;
  });

  // The eyebrow over the score, saying what kind of number it is. An unofficial final is the one
  // state that needs a colour: the score is real but grading has not blessed it yet.
  const statusLabel = $derived.by(() => {
    if (inProgress) return clockLabel || 'Live';
    if (finalUnofficial) return 'Final · unofficial';
    if (game.isFinal) return 'Final';
    return null;
  });

  // Who beat the number, and by how much, at the line the header is already printing (#838).
  // Deliberately the GAME's line, not any member's frozen one — see `gameCover`'s contract.
  const cover = $derived.by(() => {
    if (!shownScore) return null;
    return gameCover({
      home: game.home,
      away: game.away,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      spreadTeamId: game.spreadTeamId,
      spreadValue: game.spreadValue,
      homeScore: shownScore.home,
      awayScore: shownScore.away
    });
  });

  // Present tense only while the ball is still in play; an unofficial final is already decided,
  // and its "Final · unofficial" eyebrow carries the caveat.
  const coverLabel = $derived.by(() => {
    if (!cover) return null;
    if (cover.side == null) return 'Push';
    return `${cover.team} ${inProgress ? 'covering' : 'covered'} by ${fmtPoints(cover.by)}`;
  });

  // Green for the side that beat the number, amber for a push — never red. The team rows below
  // already spend green/red on "these picks won / lost", and on an underdog-covers game a red
  // header would sit directly over a green underdog row that also covered.
  const coverClass = $derived(cover?.side == null ? 'text-warning' : 'text-success');

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
  // A member who joined after this game kicked off (ADR-0037) is split out from genuine
  // no-picks: the game was never theirs, so it reads as a neutral "Not in yet", not a miss.
  const notIn = $derived(
    showNoPick ? game.picks.filter((p) => p.notParticipating).toSorted(sortMembers) : []
  );
  const noPick = $derived(
    showNoPick
      ? game.picks.filter((p) => p.pickedSide == null && !p.notParticipating).toSorted(sortMembers)
      : []
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

<!-- Density follows the task (DESIGN principle 15): a week is a grid of up to sixteen of these
     side by side, so the card trims the vendored `px-6`/`py-6` to `px-4`/`py-4` and buys back
     ~16px of content width at 390px, where the member lists are what needs it. -->
<Card class="gap-3 py-4">
  <CardHeader class="gap-0 px-4 pb-0">
    <!-- Two columns, one job each: identity on the left (which game, at what number), result on
         the right (what happened, and who beat that number). Before #838 all four lived in one
         wrapping row at near-identical weights, so the score — the thing a settled card exists
         to report — read as a footnote to the matchup. -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <CardTitle class="text-base font-semibold">{game.away} @ {game.home}</CardTitle>
        {#if lineLabel}
          <p class="mt-0.5 text-xs text-muted-foreground tabular-nums" data-testid="game-line">
            {lineLabel}
          </p>
        {/if}
      </div>

      {#if scoreLabel}
        <div class="shrink-0 text-right">
          {#if statusLabel}
            <p
              class="flex items-center justify-end gap-1 text-eyebrow uppercase {finalUnofficial
                ? 'text-warning'
                : 'text-muted-foreground'}"
              data-testid={finalUnofficial ? 'final-unofficial' : undefined}
            >
              {#if inProgress}
                <span class="size-1.5 animate-pulse rounded-full bg-destructive" aria-hidden="true"
                ></span>
              {/if}
              {statusLabel}
            </p>
          {/if}
          <!-- Deliberately NOT `text-stat`: that token is the page-hero numeral (2rem), and at
               sixteen cards to a week it shouted. 24px still reads as the card's anchor against
               the 16px matchup without turning the grid into a wall of scoreboards.

               `live-score` vs `final-score` tracks the SOURCE, not the game state: a
               final-but-ungraded score still comes off the ESPN feed. -->
          <p
            class="text-2xl leading-tight font-bold tabular-nums"
            data-testid={liveLit ? 'live-score' : 'final-score'}
          >
            {scoreLabel}
          </p>
          {#if coverLabel}
            <p class="text-xs font-medium {coverClass}" data-testid="game-cover">{coverLabel}</p>
          {/if}
        </div>
      {/if}
    </div>
  </CardHeader>
  <CardContent class="space-y-1.5 px-4 pt-0">
    {#if !showNoPick && picked.length === 0}
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
              <span class="block text-xs font-medium tabular-nums" data-testid="cover-cushion"
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
                  class="rounded bg-muted px-1 text-xs leading-tight font-medium text-muted-foreground"
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

    {#if notIn.length > 0}
      <div class="flex gap-2" data-testid="not-participating">
        <span class="mt-0.5 w-12 shrink-0 text-xs font-medium text-muted-foreground/70"
          >Not in yet</span
        >
        <ul class="flex flex-1 flex-wrap gap-x-2.5 gap-y-1">
          {#each notIn as p (p.userId)}
            <li class="flex items-center gap-1 text-xs text-muted-foreground/70">
              <UserAvatar size="xs" avatarKey={p.avatarKey} displayName={p.displayName} />
              <span class="inline-block max-w-[140px] truncate align-bottom sm:max-w-[200px]">
                {p.displayName}{p.isYou ? ' (you)' : ''}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </CardContent>
</Card>
