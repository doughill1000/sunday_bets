import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { sendToUser } from '$lib/server/push';

// POST /api/push/test — admin-only: send a test notification to yourself.
export const POST: RequestHandler = async (event) => {
  const guard = await requireAdmin(event);
  if (guard) return guard;

  const user = event.locals.user!;
  try {
    const result = await sendToUser(user.id, {
      title: 'Hotshot test',
      body: 'Push notifications are working. 🏈',
      url: '/settings',
      tag: 'test'
    });
    // `total` is the denominator (#815): without it the card can't tell "you have no
    // subscriptions" from "all of your subscriptions rejected the push", and the old
    // card reported both as the former. Spelled out rather than spread so the
    // response contract stays explicit.
    return json({ ok: true, sent: result.sent, total: result.total, pruned: result.pruned });
  } catch (e) {
    return json(
      { ok: false, reason: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
