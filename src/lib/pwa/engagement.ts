// Pure, DOM-free logic that determines which engagement step to show.
// Returns a discriminated union so each step maps to distinct banner copy.
//
// Split into chooseInstallStep (sync inputs only) and chooseNotifStep (needs the
// async hasPushSubscription() check) so callers can resolve the install decision
// immediately without waiting on push-subscription state it doesn't need.

export type EngagementStep =
  'install-ios' | 'install-prompt' | 'notif-enable' | 'notif-denied' | 'none';

export interface InstallInput {
  isStandalone: boolean;
  isIos: boolean;
  canInstall: boolean; // beforeinstallprompt captured and not yet consumed
  installDismissed: boolean;
}

export interface NotifInput {
  pushSupported: boolean;
  notifPermission: NotificationPermission | 'unsupported';
  hasSubscription: boolean;
  notifDismissed: boolean;
}

export type EngagementInput = InstallInput & NotifInput;

/**
 * Returns the install step, or `null` if the install branch doesn't apply (already
 * standalone, or previously dismissed) — callers should fall through to
 * {@link chooseNotifStep} in that case.
 */
export function chooseInstallStep(input: InstallInput): EngagementStep | null {
  const { isStandalone, isIos, canInstall, installDismissed } = input;

  if (isStandalone || installDismissed) return null;

  if (isIos) return 'install-ios';
  if (canInstall) return 'install-prompt';
  // No beforeinstallprompt captured and not iOS — nothing actionable to show.
  return 'none';
}

export function chooseNotifStep(input: NotifInput): EngagementStep {
  const { pushSupported, notifPermission, hasSubscription, notifDismissed } = input;

  if (!pushSupported || notifPermission === 'unsupported') return 'none';
  if (hasSubscription || notifPermission === 'granted') return 'none';
  if (notifDismissed) return 'none';

  if (notifPermission === 'denied') return 'notif-denied';
  return 'notif-enable'; // permission is 'default'
}

export function chooseEngagementStep(input: EngagementInput): EngagementStep {
  const installStep = chooseInstallStep(input);
  if (installStep !== null) return installStep;
  return chooseNotifStep(input);
}
