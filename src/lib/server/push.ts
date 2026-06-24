// Server-only web-push sender. Configures VAPID lazily so unit tests and code
// paths that never send don't require the keys to be present.
import webpush from 'web-push';
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { PushPayload } from '$lib/domain/notifications';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const vapidPublicKey = publicEnv.PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = privateEnv.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys are not configured (PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
  }
  webpush.setVapidDetails(
    privateEnv.VAPID_SUBJECT || 'mailto:admin@sundaybets.app',
    vapidPublicKey,
    vapidPrivateKey
  );
  configured = true;
}

export type SendResult = { sent: number; pruned: number };

/**
 * Push `payload` to every subscription belonging to `userId`. Subscriptions
 * that the push service reports as gone (404/410) are pruned; other failures
 * are reported to Sentry but don't abort the batch.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  ensureConfigured();

  const { data: subs, error } = await supabaseService
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', userId);

  if (error) throw error;
  if (!subs || subs.length === 0) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        body
      );
      sent++;
    } catch (e) {
      const statusCode = (e as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadIds.push(sub.id);
      } else {
        Sentry.captureException(e);
      }
    }
  }

  if (deadIds.length > 0) {
    await supabaseService.from('push_subscriptions').delete().in('id', deadIds);
  }

  return { sent, pruned: deadIds.length };
}
