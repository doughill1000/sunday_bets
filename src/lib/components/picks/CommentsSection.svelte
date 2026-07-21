<script lang="ts">
  import { untrack } from 'svelte';
  import type { SocialComment } from '$lib/server/db/queries/getCommentsForGame';
  import type { ReactionRow } from '$lib/server/db/queries/getReactionsForComments';

  interface Props {
    gameId: string;
    comments: SocialComment[];
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
  let comments = $state<SocialComment[]>(untrack(() => initialComments));

  let commentInput = $state('');
  let submittingComment = $state(false);
  let commentError = $state('');
  let deletingId = $state<string | null>(null);

  // Which comment's emoji picker is open (comment id), and which chip's reactor
  // names are revealed (`${commentId}:${emoji}`). Only one of each at a time.
  let pickerOpenFor = $state<string | null>(null);
  let revealedFor = $state<string | null>(null);

  // Frozen tapback set (#689) — deliberately not configurable.
  const ALLOWED_EMOJIS = ['👍', '👎', '🔥', '😬', '🎯'];

  const EMOJI_SLUG: Record<string, string> = {
    '👍': 'thumbsup',
    '👎': 'thumbsdown',
    '🔥': 'fire',
    '😬': 'grimace',
    '🎯': 'dart'
  };

  type ChipGroup = { emoji: string; reactors: ReactionRow[]; count: number; mine: boolean };

  // Reactions on a comment, grouped by emoji, in the frozen emoji order. Only
  // emojis with at least one reaction produce a chip.
  function chipGroups(comment: SocialComment): ChipGroup[] {
    return ALLOWED_EMOJIS.map((emoji) => {
      const reactors = comment.reactions.filter((r) => r.emoji === emoji);
      return {
        emoji,
        reactors,
        count: reactors.length,
        mine: reactors.some((r) => r.user_id === currentUserId)
      };
    }).filter((g) => g.count > 0);
  }

  function userReacted(comment: SocialComment, emoji: string): boolean {
    return comment.reactions.some((r) => r.emoji === emoji && r.user_id === currentUserId);
  }

  function reactorNames(reactors: ReactionRow[]): string {
    return reactors.map((r) => r.display_name ?? 'Member').join(', ');
  }

  function setReactions(commentId: string, next: ReactionRow[]) {
    comments = comments.map((c) => (c.id === commentId ? { ...c, reactions: next } : c));
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
          display_name: currentUserDisplayName,
          reactions: []
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

  // Toggle the current user's reaction of `emoji` on a comment. Driven by the
  // per-comment picker; tapping an emoji already in your set removes it.
  async function toggleReaction(comment: SocialComment, emoji: string) {
    pickerOpenFor = null;
    const prev = comment.reactions;

    if (userReacted(comment, emoji)) {
      setReactions(
        comment.id,
        prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
      );
      const res = await fetch(`/api/reactions/${comment.id}?emoji=${encodeURIComponent(emoji)}`, {
        method: 'DELETE'
      });
      if (!res.ok) setReactions(comment.id, prev); // roll back
    } else {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setReactions(comment.id, [
        ...prev,
        {
          id: tempId,
          user_id: currentUserId ?? '',
          comment_id: comment.id,
          emoji,
          created_at: new Date().toISOString(),
          display_name: currentUserDisplayName
        }
      ]);
      const res = await fetch(`/api/reactions/${comment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      const result = await res.json().catch(() => ({ ok: false }));
      if (!result.ok && !result.duplicate) setReactions(comment.id, prev); // roll back
    }
  }

  function toggleReveal(commentId: string, emoji: string) {
    const key = `${commentId}:${emoji}`;
    revealedFor = revealedFor === key ? null : key;
  }

  function togglePicker(commentId: string) {
    pickerOpenFor = pickerOpenFor === commentId ? null : commentId;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  }
</script>

<div class="space-y-3 border-t pt-3" data-testid="comments-section">
  <!-- Comment list -->
  {#if comments.length > 0}
    <ul class="space-y-2.5" aria-label="Comments">
      {#each comments as comment (comment.id)}
        {@const groups = chipGroups(comment)}
        <li class="group space-y-1 text-sm" data-testid="comment-row" data-comment-id={comment.id}>
          <div class="flex items-start gap-1.5">
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
          </div>

          <!-- Tapbacks: a chip per emoji with ≥1 reaction, plus a compact picker. -->
          <div class="flex flex-wrap items-center gap-1" aria-label="Reactions">
            {#each groups as g (g.emoji)}
              {@const revealed = revealedFor === `${comment.id}:${g.emoji}`}
              <button
                type="button"
                onclick={() => toggleReveal(comment.id, g.emoji)}
                aria-expanded={revealed}
                aria-label="{g.emoji} {g.count} reaction{g.count !== 1
                  ? 's'
                  : ''} — show who reacted"
                data-testid="reaction-chip-{EMOJI_SLUG[g.emoji]}"
                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm
                       transition-colors
                       {g.mine
                  ? 'border-primary-ink bg-primary/10 font-medium'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary-ink/50'}"
              >
                <span>{g.emoji}</span>
                <span class="tabular-nums">{g.count}</span>
              </button>
            {/each}

            <!-- Compact add-reaction affordance opening the frozen 5-emoji picker. -->
            <button
              type="button"
              onclick={() => togglePicker(comment.id)}
              aria-expanded={pickerOpenFor === comment.id}
              aria-label="Add a reaction"
              data-testid="reaction-add"
              class="inline-flex size-6 items-center justify-center rounded-full border border-border
                     bg-muted/40 text-sm leading-none text-muted-foreground transition-colors
                     hover:border-primary-ink/50 hover:text-foreground"
            >
              ＋
            </button>

            {#if pickerOpenFor === comment.id}
              <div
                class="inline-flex items-center gap-0.5 rounded-full border border-border bg-popover px-1 py-0.5"
                role="group"
                aria-label="Choose a reaction"
                data-testid="reaction-picker"
              >
                {#each ALLOWED_EMOJIS as emoji (emoji)}
                  {@const mine = userReacted(comment, emoji)}
                  <button
                    type="button"
                    onclick={() => toggleReaction(comment, emoji)}
                    aria-pressed={mine}
                    aria-label={emoji}
                    data-testid="reaction-pick-{EMOJI_SLUG[emoji]}"
                    class="rounded-full px-1.5 py-0.5 text-base leading-none transition-colors
                           {mine ? 'bg-primary/10' : 'hover:bg-muted'}"
                  >
                    {emoji}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Revealed reactor names for the tapped chip. -->
          {#each groups as g (g.emoji)}
            {#if revealedFor === `${comment.id}:${g.emoji}`}
              <p class="pl-0.5 text-xs text-muted-foreground" data-testid="reaction-reactors">
                {g.emoji}
                {reactorNames(g.reactors)}
              </p>
            {/if}
          {/each}
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
      class="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5
             text-sm placeholder:text-muted-foreground focus-visible:ring-1
             focus-visible:ring-ring focus-visible:outline-none"
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
