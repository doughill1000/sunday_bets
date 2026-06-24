<script lang="ts">
  import type { CommentRow } from '$lib/server/db/queries/getCommentsForGame';
  import type { ReactionRow } from '$lib/server/db/queries/getReactionsForGame';

  interface Props {
    gameId: string;
    comments: CommentRow[];
    reactions: ReactionRow[];
    currentUserId: string | null;
  }

  let {
    gameId,
    comments: initialComments,
    reactions: initialReactions,
    currentUserId
  }: Props = $props();

  // Local copies so we can update optimistically
  let comments = $state<CommentRow[]>(initialComments);
  let reactions = $state<ReactionRow[]>(initialReactions);

  let commentInput = $state('');
  let submittingComment = $state(false);
  let commentError = $state('');

  const ALLOWED_EMOJIS = ['👍', '👎', '🔥', '😬', '🎯'];

  function reactionCount(emoji: string): number {
    return reactions.filter((r) => r.emoji === emoji).length;
  }

  function userReacted(emoji: string): boolean {
    return reactions.some((r) => r.emoji === emoji && r.user_id === currentUserId);
  }

  async function postComment() {
    const body = commentInput.trim();
    if (!body || submittingComment) return;

    submittingComment = true;
    commentError = '';

    try {
      const res = await fetch(`/api/comments/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const result = await res.json();

      if (!result.ok) {
        commentError = result.reason ?? 'Could not post comment.';
        return;
      }

      comments = [
        ...comments,
        {
          id: result.comment.id,
          user_id: currentUserId ?? '',
          game_id: gameId,
          body: result.comment.body,
          created_at: result.comment.created_at,
          display_name: null
        }
      ];
      commentInput = '';
    } catch {
      commentError = 'Network error — try again.';
    } finally {
      submittingComment = false;
    }
  }

  async function toggleReaction(emoji: string) {
    if (userReacted(emoji)) {
      // Optimistic remove
      const prev = reactions;
      reactions = reactions.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId));

      const res = await fetch(`/api/reactions/${gameId}?emoji=${encodeURIComponent(emoji)}`, {
        method: 'DELETE'
      });
      if (!res.ok) reactions = prev; // roll back on failure
    } else {
      // Optimistic add
      const tempId = crypto.randomUUID();
      const prev = reactions;
      reactions = [
        ...reactions,
        {
          id: tempId,
          user_id: currentUserId ?? '',
          game_id: gameId,
          emoji,
          created_at: new Date().toISOString()
        }
      ];

      const res = await fetch(`/api/reactions/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      const result = await res.json();
      if (!result.ok && !result.duplicate) {
        reactions = prev; // roll back
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  }
</script>

<div class="border-t pt-3 space-y-3">
  <!-- Reactions -->
  <div class="flex flex-wrap gap-1" aria-label="Reactions">
    {#each ALLOWED_EMOJIS as emoji (emoji)}
      {@const count = reactionCount(emoji)}
      {@const active = userReacted(emoji)}
      <button
        type="button"
        onclick={() => toggleReaction(emoji)}
        aria-label="{emoji} {count} reaction{count !== 1 ? 's' : ''}"
        aria-pressed={active}
        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm
               transition-colors
               {active
          ? 'border-primary bg-primary/10 font-medium'
          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50'}"
      >
        <span>{emoji}</span>
        {#if count > 0}
          <span class="tabular-nums">{count}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Comment list -->
  {#if comments.length > 0}
    <ul class="space-y-1.5" aria-label="Comments">
      {#each comments as comment (comment.id)}
        <li class="text-sm">
          <span class="font-medium">{comment.display_name ?? 'Member'}:</span>
          <span class="ml-1 text-foreground/80">{comment.body}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Comment input -->
  <form
    onsubmit={(e) => {
      e.preventDefault();
      postComment();
    }}
    class="flex gap-2"
  >
    <input
      type="text"
      bind:value={commentInput}
      onkeydown={handleKeydown}
      placeholder="Add a comment…"
      maxlength="500"
      aria-label="Comment text"
      class="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-1.5
             text-sm placeholder:text-muted-foreground focus-visible:outline-none
             focus-visible:ring-1 focus-visible:ring-ring"
    />
    <button
      type="submit"
      disabled={!commentInput.trim() || submittingComment}
      class="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground
             disabled:opacity-50"
    >
      Post
    </button>
  </form>

  {#if commentError}
    <p class="text-xs text-destructive">{commentError}</p>
  {/if}
</div>
