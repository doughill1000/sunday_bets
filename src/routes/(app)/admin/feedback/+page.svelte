<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Card, CardContent } from '$lib/components/ui/card';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const KIND_META: Record<string, { label: string; emoji: string }> = {
    bug: { label: 'Bug', emoji: '🐞' },
    idea: { label: 'Idea', emoji: '💡' },
    confused: { label: 'Confused', emoji: '❓' },
    love: { label: 'Love', emoji: '❤️' }
  };

  const STATUS_META: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    new: { label: 'New', variant: 'default' },
    triaged: { label: 'Triaged', variant: 'secondary' },
    filed: { label: 'Filed', variant: 'outline' },
    dismissed: { label: 'Dismissed', variant: 'outline' }
  };

  const FILTERS = [
    { key: '', label: 'All', countKey: 'all' },
    { key: 'new', label: 'New', countKey: 'new' },
    { key: 'triaged', label: 'Triaged', countKey: 'triaged' },
    { key: 'filed', label: 'Filed', countKey: 'filed' },
    { key: 'dismissed', label: 'Dismissed', countKey: 'dismissed' }
  ] as const;

  function kindMeta(kind: string) {
    return KIND_META[kind] ?? { label: kind, emoji: '' };
  }
  function statusMeta(status: string) {
    return STATUS_META[status] ?? { label: status, variant: 'outline' as const };
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  // The FULL private context (richer than the public issue carries — ADR-0028
  // Decision 6). Rendered for the operator only; the sanitizer picks the public
  // subset at filing time.
  function contextEntries(context: unknown): { label: string; value: string }[] {
    if (!context || typeof context !== 'object') return [];
    const c = context as Record<string, unknown>;
    const out: { label: string; value: string }[] = [];
    const push = (label: string, value: unknown) => {
      if (value === null || value === undefined || value === '') return;
      out.push({ label, value: String(value) });
    };
    push('Route', c.route);
    push('Build', c.buildId);
    if (c.viewport && typeof c.viewport === 'object') {
      const vp = c.viewport as { width?: number; height?: number };
      if (typeof vp.width === 'number' && typeof vp.height === 'number') {
        push('Viewport', `${vp.width}×${vp.height}`);
      }
    }
    push('Season', c.seasonYear);
    push('League', c.groupId);
    push('Sentry event', c.sentryEventId);
    push('User', c.userId);
    push('User agent', c.userAgent);
    return out;
  }

  // Per-row banner from the most recent action result (filing / degradation / error).
  // The action results are a wide union (two actions × success/fail); read them via
  // one explicit optional-field shape rather than `in`-narrowing the union.
  type FeedbackActionResult = {
    id?: string;
    filed?: boolean;
    url?: string;
    degraded?: boolean;
    prefilledUrl?: string;
    error?: string;
  };
  function bannerFor(id: string) {
    const f = form as unknown as FeedbackActionResult | null;
    if (!f || f.id !== id) return null;
    if (f.filed) return { kind: 'success' as const, url: f.url };
    if (f.degraded) return { kind: 'degraded' as const, url: f.prefilledUrl };
    if (f.error) return { kind: 'error' as const, text: f.error, url: f.url };
    return null;
  }
</script>

<section class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
  <header class="space-y-1">
    <h1 class="text-2xl font-bold">Feedback inbox</h1>
    <p class="text-sm text-muted-foreground">
      In-app reports (issue #500). Review each item, then file the worth-fixing ones to GitHub.
      Reporter identity and diagnostic ids stay in this private queue and never cross into the
      public issue.
    </p>
    {#if !data.tokenConfigured}
      <p class="text-sm text-warning">
        No GitHub token configured — “File to GitHub” will hand you a prefilled new-issue link to
        open manually.
      </p>
    {/if}
  </header>

  <nav class="flex flex-wrap gap-2" aria-label="Filter by status">
    {#each FILTERS as f (f.key)}
      {@const active = (data.filter ?? '') === f.key}
      <a
        href={f.key ? `?status=${f.key}` : '?'}
        class="rounded-full border px-3 py-1 text-sm transition-colors"
        class:bg-primary={active}
        class:text-primary-foreground={active}
        class:border-transparent={active}
        class:text-muted-foreground={!active}
        aria-current={active ? 'page' : undefined}
      >
        {f.label}
        <span class="opacity-70">({data.counts[f.countKey]})</span>
      </a>
    {/each}
  </nav>

  {#if data.rows.length === 0}
    <Card>
      <CardContent class="p-6 text-center text-sm text-muted-foreground">
        No feedback{data.filter ? ` with status “${data.filter}”` : ''} yet.
      </CardContent>
    </Card>
  {/if}

  {#each data.rows as row (row.id)}
    {@const km = kindMeta(row.kind)}
    {@const sm = statusMeta(row.status)}
    {@const banner = bannerFor(row.id)}
    <Card>
      <CardContent class="space-y-3 p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{km.emoji} {km.label}</Badge>
          <Badge variant={sm.variant}>{sm.label}</Badge>
          <span class="ml-auto text-xs text-muted-foreground">{fmtDate(row.created_at)}</span>
        </div>

        <p class="rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{row.body}</p>

        {#if contextEntries(row.context).length}
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {#each contextEntries(row.context) as entry (entry.label)}
              <dt class="font-medium">{entry.label}</dt>
              <dd class="font-mono break-all">{entry.value}</dd>
            {/each}
          </dl>
        {/if}

        {#if row.github_issue_url}
          <p class="text-sm">
            Filed:
            <a
              href={row.github_issue_url}
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium underline">{row.github_issue_url}</a
            >
          </p>
        {/if}

        {#if banner}
          {#if banner.kind === 'success'}
            <p class="rounded-lg border border-success bg-success/10 p-2 text-sm">
              Filed to <a href={banner.url} class="font-medium underline">{banner.url}</a>.
            </p>
          {:else if banner.kind === 'degraded'}
            <p class="rounded-lg border border-warning bg-warning/10 p-2 text-sm">
              Token unavailable — open this prefilled issue in your GitHub session, then submit it:
              <a
                href={banner.url}
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium underline">Open prefilled issue ↗</a
              >
            </p>
          {:else}
            <p class="rounded-lg border border-destructive bg-destructive/10 p-2 text-sm">
              {banner.text}
              {#if banner.url}
                — <a href={banner.url} class="font-medium underline">{banner.url}</a>
              {/if}
            </p>
          {/if}
        {/if}

        <div class="flex flex-wrap gap-2 pt-1">
          {#if !row.github_issue_url}
            <form method="POST" action="?/file" use:enhance>
              <input type="hidden" name="id" value={row.id} />
              <Button type="submit" variant="default" size="sm">File to GitHub</Button>
            </form>
          {/if}

          {#if row.status !== 'triaged' && row.status !== 'filed'}
            <form method="POST" action="?/status" use:enhance>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="status" value="triaged" />
              <Button type="submit" variant="outline" size="sm">Mark triaged</Button>
            </form>
          {/if}

          {#if row.status !== 'dismissed'}
            <form method="POST" action="?/status" use:enhance>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="status" value="dismissed" />
              <Button type="submit" variant="ghost" size="sm">Dismiss</Button>
            </form>
          {:else}
            <form method="POST" action="?/status" use:enhance>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="status" value="new" />
              <Button type="submit" variant="ghost" size="sm">Reopen</Button>
            </form>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/each}
</section>
