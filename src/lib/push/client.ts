// Browser-side push subscription helpers. Used by the /settings page.
import { env } from '$env/dynamic/public';

export type PushResult = { ok: boolean; reason?: string };

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Back with a concrete ArrayBuffer so the result satisfies BufferSource.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Request permission, create/reuse a subscription, and register it server-side. */
export async function subscribeToPush(): Promise<PushResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  const vapidPublicKey = env.PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return { ok: false, reason: 'missing-vapid-key' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON())
  });
  if (!res.ok) return { ok: false, reason: 'server-error' };
  return { ok: true };
}

/** Tear down the browser subscription and remove it server-side. */
export async function unsubscribeFromPush(): Promise<PushResult> {
  if (!isPushSupported()) return { ok: true };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    });
  }
  return { ok: true };
}
