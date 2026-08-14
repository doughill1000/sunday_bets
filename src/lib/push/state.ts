// Pure, DOM-free reconciliation of the account-level notification pref against what this
// device actually holds. Mirrors the split in $lib/pwa/engagement.ts: the decision lives
// here where it is testable, the async browser reads live in ./client.

export type PushDeviceStatus = {
  /** This browser exposes the service worker + push + Notification APIs. */
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  /** This device holds a live PushSubscription (pushManager.getSubscription()). */
  subscribed: boolean;
};

export type PushCardState =
  /** No push API on this browser/device (desktop Safari, iOS outside the home screen). */
  | 'unsupported'
  /** Permission denied in browser settings — only the user can undo that, outside the app. */
  | 'blocked'
  /** The account switch is off. */
  | 'off'
  /** On for the account *and* subscribed on this device: notifications actually arrive. */
  | 'on'
  /** On for the account but this device holds no subscription — nothing arrives here. */
  | 'device-unsubscribed';

/**
 * `accountEnabled` is `users.notification_prefs.enabled` — an account-level flag that says
 * nothing about whether *this* device can receive anything. Before #814 the settings card
 * rendered it alone, so a device that had lost its subscription (PWA reinstalled, service
 * worker re-registered) showed a "Disable" button implying notifications were working.
 *
 * `device === null` means the async device read has not resolved yet — including the case
 * where it never will: `navigator.serviceWorker.ready` waits forever on a browser with no
 * registered service worker, so this must fall back to the account-level answer rather
 * than to a spinner or to a false "not set up on this device" alarm.
 */
export function resolvePushCardState(
  accountEnabled: boolean,
  device: PushDeviceStatus | null
): PushCardState {
  if (device === null) return accountEnabled ? 'on' : 'off';
  if (!device.supported || device.permission === 'unsupported') return 'unsupported';
  // Blocked outranks the subscription check: a denied device never has one, and its own
  // banner already names the remedy (re-allow in browser settings). Reporting both would
  // be two warnings for one cause.
  if (device.permission === 'denied') return 'blocked';
  if (!accountEnabled) return 'off';
  return device.subscribed ? 'on' : 'device-unsubscribed';
}
