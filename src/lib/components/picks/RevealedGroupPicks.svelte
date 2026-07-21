<script lang="ts">
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import { weightPoints } from '$lib/domain/scoring';
  import { liveCoverState, type CoverVerdict } from '$lib/domain/liveCover';
  import { verdictDotClass, verdictAria } from '$lib/live/display';
  import type { GroupPickEntry } from '$lib/types/picks';
  import type { PickGame } from '$lib/types/games';
  import type { LiveScoreEntry } from '$lib/live/types';

  interface Props {
    picks: GroupPickEntry[];
    myUserId: string;
    /** Live sweat board (#386): the game + its live score drive a per-member cover dot. */
    game?: PickGame | null;
    liveScore?: LiveScoreEntry | null;
    liveStale?: boolean;
  }
  let { picks, myUserId, game = null, liveScore = null, liveStale = false }: Props = $props();

  // Each member's live cover verdict, or null when there's no live score / insufficient data.
  // Display-only mirror of grading against the live score (does not assert while stale).
  function coverOf(p: GroupPickEntry): CoverVerdict | null {
    if (!game || !liveScore || liveStale) return null;
    const state = liveCoverState({
      homeScore: liveScore.homeScore,
      awayScore: liveScore.awayScore,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      pickedTeamId: p.pickedTeamId ?? null,
      lockedSpreadTeamId: p.lockedSpreadTeamId ?? null,
      lockedSpreadValue: p.lockedSpreadValue ?? null
    });
    return state?.verdict ?? null;
  }

  function pointsOf(w: GroupPickEntry['weight']) {
    return w ? weightPoints(w) : 0;
  }

  // Within a team: the current user first, then heaviest weight, then name.
  function sortMembers(a: GroupPickEntry, b: GroupPickEntry) {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    const byWeight = pointsOf(b.weight) - pointsOf(a.weight);
    if (byWeight !== 0) return byWeight;
    return (a.displayName ?? '').localeCompare(b.displayName ?? '');
  }

  // Order team blocks away-then-home to match the "AWAY @ HOME" matchup title.
  function sideRank(side: GroupPickEntry['pickedSide']) {
    return side === 'away' ? 0 : side === 'home' ? 1 : 2;
  }

  type TeamGroup = {
    side: GroupPickEntry['pickedSide'];
    label: string;
    members: GroupPickEntry[];
  };

  const teams = $derived.by(() => {
    const groups: Record<string, TeamGroup> = {};
    for (const p of picks) {
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
</script>

{#if picks.length > 0}
  <div class="mt-2 border-t pt-2">
    <p class="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      Group picks
    </p>
    <div class="space-y-1.5">
      {#each teams as team (team.label)}
        <div class="flex gap-2">
          <span class="mt-0.5 w-10 shrink-0 text-xs font-semibold">{team.label}</span>
          <ul class="flex flex-1 flex-wrap gap-x-2.5 gap-y-1">
            {#each team.members as p (p.userId)}
              {@const isMe = p.userId === myUserId}
              {@const verdict = coverOf(p)}
              <li class="flex items-center gap-1 text-xs">
                {#if verdict}
                  <span
                    class="size-1.5 shrink-0 rounded-full {verdictDotClass(verdict)}"
                    title={verdictAria(verdict)}
                    aria-label={verdictAria(verdict)}
                    data-testid="member-cover-dot"
                  ></span>
                {/if}
                <UserAvatar size="xs" avatarKey={p.avatarKey} displayName={p.displayName ?? '?'} />
                <span
                  class="inline-block max-w-[140px] truncate align-bottom sm:max-w-[200px] {isMe
                    ? 'font-semibold'
                    : 'text-muted-foreground'}"
                >
                  {p.displayName ?? p.userId}{isMe ? ' (you)' : ''}
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
    </div>
  </div>
{/if}
