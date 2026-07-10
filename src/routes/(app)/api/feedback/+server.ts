import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';
import type { FeedbackKind } from '$lib/feedback/context';

const KINDS = ['bug', 'idea', 'confused', 'love'] as const satisfies readonly FeedbackKind[];
const MAX_BODY = 4000;

function isKind(value: unknown): value is FeedbackKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

// Store-first, no LLM (ADR-0028): a submission writes one `feedback` row and returns.
// Filing to GitHub is a separate, admin-gated step (issue #500 follow-up). The request
// shape is app-agnostic so the RN app can POST the same endpoint later.
export const POST: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  let payload: { body?: unknown; kind?: unknown; context?: unknown };
  try {
    payload = await event.request.json();
  } catch {
    return json({ ok: false, reason: 'Invalid request' }, { status: 400 });
  }

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body) return json({ ok: false, reason: 'Feedback cannot be empty' }, { status: 400 });
  if (body.length > MAX_BODY)
    return json({ ok: false, reason: 'Feedback is too long' }, { status: 400 });

  const kind: FeedbackKind = isKind(payload.kind) ? payload.kind : 'idea';

  // Trust the client only for descriptive context; stamp identity + season
  // server-side (never client-trusted). Season is best-effort (memoized per request).
  const clientContext =
    payload.context && typeof payload.context === 'object' && !Array.isArray(payload.context)
      ? (payload.context as Record<string, unknown>)
      : {};
  const seasonYear = await event.locals.getCurrentSeasonYear().catch(() => null);
  const context = { ...clientContext, userId: user.id, seasonYear };

  const { error } = await supabaseService
    .from('feedback')
    .insert({ user_id: user.id, kind, body, context });

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });
  return json({ ok: true });
};
