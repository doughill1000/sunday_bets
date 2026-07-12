<script lang="ts">
  // Two-sided team book (issue #564): the Ride ▸ / Fade ▸ standouts that supersede the old
  // backed-only "Team" breakdown. Ride = the teams the player most reliably backs; Fade = the
  // teams they most reliably bet against — the half stats_accuracy_by_team never had. Standouts
  // only, sample-guarded by `teamBookStandouts`, so 32 teams don't become 32 noisy rows. Rendered
  // inside the Breakdowns panel (no Card of its own); the caller passes the selected player + scope.
  import { formatAccuracy } from '$lib/utils/stats';
  import type { TeamBookStandout, TeamBookStandouts } from '$lib/utils/stats';
  import { TEAM_BOOK_MIN_SAMPLE } from '$lib/utils/stats';

  let {
    standouts,
    isYou,
    displayName
  }: {
    standouts: TeamBookStandouts;
    isYou: boolean;
    displayName: string;
  } = $props();

  const subject = $derived(isYou ? 'you' : displayName);
  const hasAny = $derived(standouts.ride.length > 0 || standouts.fade.length > 0);

  const record = (t: TeamBookStandout) =>
    `${t.wins}-${t.losses}${t.pushes > 0 ? `-${t.pushes}` : ''}`;
</script>

{#snippet book(rows: TeamBookStandout[], heading: string, tone: 'ride' | 'fade')}
  <div class="space-y-1">
    <p
      class="font-mono text-[0.6rem] font-semibold tracking-wider uppercase {tone === 'ride'
        ? 'text-primary'
        : 'text-chart-2'}"
    >
      ▸ {heading}
    </p>
    <ul>
      {#each rows as row (row.teamId)}
        <li
          class="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2 border-b py-1.5 last:border-0"
        >
          <span
            class="grid h-5 w-8 place-items-center rounded border bg-secondary font-mono text-[0.6rem] font-bold"
            title={row.teamName}
          >
            {row.teamShort}
          </span>
          <span class="truncate text-sm">{row.teamName}</span>
          <span
            class="font-mono text-sm font-bold tabular-nums {row.cover >= 0.5
              ? 'text-success'
              : 'text-destructive'}"
          >
            {record(row)}
          </span>
          <span
            class="min-w-[3rem] text-right font-mono text-xs text-muted-foreground tabular-nums"
          >
            {formatAccuracy(row.cover)}
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

{#if !hasAny}
  <p class="text-sm text-muted-foreground">
    Not enough team history yet — a team shows here once {subject} have{isYou ? '' : 's'} at least
    {TEAM_BOOK_MIN_SAMPLE} decided picks backing or fading it.
  </p>
{:else}
  <div class="space-y-4">
    {#if standouts.ride.length > 0}
      {@render book(
        standouts.ride,
        isYou ? 'Teams you ride' : `Teams ${displayName} rides`,
        'ride'
      )}
    {/if}
    {#if standouts.fade.length > 0}
      {@render book(
        standouts.fade,
        isYou ? 'Teams you fade' : `Teams ${displayName} fades`,
        'fade'
      )}
    {/if}
  </div>
{/if}
