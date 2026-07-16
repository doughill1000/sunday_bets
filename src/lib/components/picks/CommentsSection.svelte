<script lang="ts">
  import { untrack } from 'svelte';
  import type { CommentRow } from '$lib/server/db/queries/getCommentsForGame';

  interface Props {
    gameId: string;
    comments: CommentRow[];
    currentUserId: string | null;
    currentUserDisplayName?: string | null;
  }

  let {
    gameId,
    comments: initialComments,
    currentUserId,
    currentUserDisplayName = null
  }: Props = $props();

  // Local copy so we can update optimistically
  let comments = $state<CommentRow[]>(untrack(() => initialComments));

  let commentInput = $state('');
  let submittingComment = $state(false);
  let commentError = $state('');
  let deletingId = $state<string | null>(null);

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
          display_name: currentUserDisplayName
        }
      ];
      commentInput = '';
    } catch {
      commentError = 'Network error — try again.';
    } finally {
      submittingComment = false;
    }
  }

  async function deleteComment(commentId: string) {
    if (deletingId) return;

    deletingId = commentId;
    commentError = '';

    const prev = comments;
    comments = comments.filter((c) => c.id !== commentId);

    try {
      const res = await fetch(`/api/comments/${gameId}?commentId=${commentId}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        comments = prev; // roll back
        commentError = result?.reason ?? 'Could not delete comment.';
      }
    } catch {
      comments = prev; // roll back
      commentError = 'Network error — try again.';
    } finally {
      deletingId = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  }
</script>

<div class="border-t pt-3 space-y-3" data-testid="comments-section">
  <!-- Comment list -->
  {#if comments.length > 0}
    <ul class="space-y-1.5" aria-label="Comments">
      {#each comments as comment (comment.id)}
        <li class="group flex items-start gap-1.5 text-sm" data-testid="comment-row">
          <span class="min-w-0 flex-1">
            <span
              class="inline-block max-w-[140px] truncate align-bottom font-medium sm:max-w-[200px]"
              >{comment.display_name ?? 'Member'}</span
            >:
            <span class="ml-1 text-foreground/80">{comment.body}</span>
          </span>
          {#if comment.user_id === currentUserId}
            <button
              type="button"
              onclick={() => deleteComment(comment.id)}
              disabled={deletingId === comment.id}
              aria-label="Delete comment"
              class="shrink-0 rounded p-0.5 text-xs text-muted-foreground opacity-60
                     transition-opacity hover:text-destructive hover:opacity-100
                     focus-visible:opacity-100 disabled:opacity-30"
            >
              ✕
            </button>
          {/if}
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
      data-testid="comment-composer"
      class="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-1.5
             text-sm placeholder:text-muted-foreground focus-visible:outline-none
             focus-visible:ring-1 focus-visible:ring-ring"
    />
    <button
      type="submit"
      disabled={!commentInput.trim() || submittingComment}
      data-testid="comment-submit"
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
