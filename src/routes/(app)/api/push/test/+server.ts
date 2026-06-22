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
      title: 'Sunday Bets test',
      body: 'Push notifications are working. 🏈',
      url: '/settings',
      tag: 'test'
    });
    return json({ ok: true, ...result });
  } catch (e) {
    return json(
      { ok: false, reason: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
