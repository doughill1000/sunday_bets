<script lang="ts">
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { PickStatusBoardEntry } from '$lib/types/picks';

  // ADR-0019 counts-only status carve-out (#388): the group-visible "who's picked"
  // board for the active week. Shows each active member's picks-made-vs-remaining
  // COUNT (e.g. 9/13) and whether they're done — never which games or sides anyone
  // picked. The counts come from the security-definer picks_status_board RPC; this
  // component only renders what it returns.
  //
  // Compact by default (#478): a full per-member roster costs a lot of vertical
  // space in a large group, so the board collapses to a one-line "N/M locked in ·
  // waiting on …" header and expands to the roster on tap.
  interface Props {
    board: PickStatusBoardEntry[];
    myUserId?: string | null;
  }
  let { board, myUserId = null }: Props = $props();

  let expanded = $state(false);

  // Laggards first (still picking), then finished; you're pinned to the top of your
  // bucket, everyone else alphabetical. Surfacing who's outstanding is the whole
  // point — "waiting on Hank".
  const sorted = $derived(
    [...board].sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      if (a.userId === myUserId) return -1;
      if (b.userId === myUserId) return 1;
      return (a.displayName ?? '').localeCompare(b.displayName ?? '');
    })
  );

  const doneCount = $derived(board.filter((m) => m.isComplete).length);

  // Who we're still waiting on, laggards-first (your own name shows as "you"). Drives
  // the collapsed one-liner so the roster can stay hidden by default.
  const waitingNames = $derived(
    sorted
      .filter((m) => !m.isComplete)
      .map((m) => (m.userId === myUserId ? 'you' : (m.displayName ?? 'someone')))
  );
  const waitingSummary = $derived.by(() => {
    if (waitingNames.length === 0) return null;
    const shown = waitingNames.slice(0, 2);
    const extra = waitingNames.length - shown.length;
    return extra > 0 ? `${shown.join(', ')}, +${extra} more` : shown.join(', ');
  });
</script>

<!-- Solo groups have no one to wait on — the summary bar already covers you. -->
{#if board.length > 1}
  <section class="mt-4 rounded-lg border bg-card" data-testid="picks-status-board">
    <button
      type="button"
      class="flex w-full items-center gap-1.5 p-3 text-left text-sm font-semibold"
      aria-expanded={expanded}
      aria-controls="picks-status-roster"
      data-testid="status-board-toggle"
      onclick={() => (expanded = !expanded)}
    >
      <span aria-hidden="true">📋</span> Who's picked
      <span class="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
        <span data-testid="status-summary">{doneCount}/{board.length} locked in</span>
        <svg
          class="h-4 w-4 transition-transform duration-150 {expanded ? 'rotate-180' : ''}"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>

    {#if !expanded && waitingSummary}
      <p class="-mt-1 px-3 pb-3 text-xs text-muted-foreground" data-testid="status-waiting">
        waiting on {waitingSummary}
      </p>
    {/if}

    {#if expanded}
      <ul id="picks-status-roster" class="space-y-1 px-3 pb-3">
        {#each sorted as m (m.userId)}
          {@const isMe = m.userId === myUserId}
          <li
            class="flex items-center gap-2 text-xs"
            data-testid="status-row"
            data-user-id={m.userId}
          >
            <UserAvatar size="xs" avatarKey={m.avatarKey} displayName={m.displayName ?? '?'} />
            <span class={isMe ? 'font-semibold' : 'text-muted-foreground'}>
              {m.displayName ?? m.userId}{isMe ? ' (you)' : ''}
            </span>
            <span class="ml-auto font-semibold tabular-nums" data-testid="status-count">
              {m.picksMade}/{m.gamesAvailable}
            </span>
            {#if m.isComplete}
              <span class="text-success" data-testid="status-done" aria-label="all picks in">✓</span
              >
            {:else}
              <span class="text-warning" data-testid="status-pending">picking…</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
