import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { supabaseService } from '$lib/supabase/service';
import {
  composeFeedbackIssue,
  fileFeedbackIssue,
  prefilledIssueUrl,
  FeedbackFilingError
} from '$lib/server/feedback/github';

// Admin triage queue for in-app feedback (issue #500, ADR-0028). The admin gate is
// enforced by the parent (app)/admin/+layout.server.ts load; each mutating action
// re-checks `locals.isAdmin` as defense in depth (layout loads don't run for form
// actions). Reads/writes go through the service role — the route is already
// admin-gated, and the admin UPDATE RLS policy exists for cookie-scoped access too.

const STATUSES = ['new', 'triaged', 'filed', 'dismissed'] as const;
type Status = (typeof STATUSES)[number];

function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ url }) => {
  const statusParam = url.searchParams.get('status') ?? '';
  const filter: Status | null = isStatus(statusParam) ? statusParam : null;

  const { data, error } = await supabaseService
    .from('feedback')
    .select('id, kind, body, context, status, github_issue_url, created_at, updated_at, user_id')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(`Failed to load feedback: ${error.message}`);

  const rows = data ?? [];
  const counts = { all: rows.length, new: 0, triaged: 0, filed: 0, dismissed: 0 };
  for (const row of rows) {
    if (isStatus(row.status)) counts[row.status] += 1;
  }

  return {
    rows: filter ? rows.filter((row) => row.status === filter) : rows,
    filter,
    counts,
    // Surfaced so the UI can pre-warn that "File to GitHub" will use the degradation
    // path (prefilled URL) rather than one-click filing.
    tokenConfigured: Boolean(env.GITHUB_FEEDBACK_TOKEN)
  };
};

export const actions: Actions = {
  // Advance a row's triage status (new → triaged / dismissed, or back). Filing has
  // its own action; this covers the manual transitions.
  status: async ({ request, locals }) => {
    if (!locals.isAdmin) return fail(403, { error: 'Forbidden' });

    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const next = String(form.get('status') ?? '');
    if (!id || !isStatus(next)) return fail(400, { error: 'Invalid status update' });

    const { error } = await supabaseService
      .from('feedback')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return fail(500, { error: error.message });

    return { ok: true };
  },

  // One-click "File to GitHub" (human-in-the-loop: the admin reviewed this row first).
  // Composes the sanitized public issue, files it via the fine-grained PAT, then
  // stamps github_issue_url + status='filed'. Missing/expired token degrades to a
  // prefilled new-issue URL — never a hard fail (ADR-0028 Decision 7).
  file: async ({ request, locals }) => {
    if (!locals.isAdmin) return fail(403, { error: 'Forbidden' });

    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing feedback id' });

    const { data: row, error: loadErr } = await supabaseService
      .from('feedback')
      .select('id, kind, body, context, status, github_issue_url')
      .eq('id', id)
      .single();
    if (loadErr || !row) return fail(404, { error: 'Feedback not found' });
    if (row.github_issue_url) {
      return fail(409, { error: 'Already filed', id, url: row.github_issue_url });
    }

    const issue = composeFeedbackIssue(row);
    const token = env.GITHUB_FEEDBACK_TOKEN;

    // No token configured → degrade to a prefilled URL the operator opens manually.
    if (!token) {
      return { degraded: true, id, prefilledUrl: prefilledIssueUrl(issue) };
    }

    try {
      const { url } = await fileFeedbackIssue({ token, issue });
      const { error: updErr } = await supabaseService
        .from('feedback')
        .update({ github_issue_url: url, status: 'filed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updErr) {
        // The issue exists but the stamp failed; hand the URL back so it isn't lost.
        return fail(500, { error: `Filed to ${url}, but could not update the row.`, id, url });
      }
      return { filed: true, id, url };
    } catch (e) {
      // Expired / unauthorized token → degrade rather than hard-fail (same as no token).
      if (e instanceof FeedbackFilingError && e.unauthorized) {
        return { degraded: true, id, prefilledUrl: prefilledIssueUrl(issue) };
      }
      return fail(502, {
        error: e instanceof Error ? e.message : 'GitHub filing failed',
        id
      });
    }
  }
};
