// Pure, DOM-free logic that determines which engagement step to show.
// Returns a discriminated union so each step maps to distinct banner copy.

export type EngagementStep =
  | 'install-ios'
  | 'install-prompt'
  | 'install-fallback'
  | 'notif-enable'
  | 'notif-denied'
  | 'none';

export interface EngagementInput {
  isStandalone: boolean;
  isIos: boolean;
  canInstall: boolean; // beforeinstallprompt captured and not yet consumed
  installDismissed: boolean;
  pushSupported: boolean;
  notifPermission: NotificationPermission | 'unsupported';
  hasSubscription: boolean;
  notifDismissed: boolean;
}

export function chooseEngagementStep(input: EngagementInput): EngagementStep {
  const {
    isStandalone,
    isIos,
    canInstall,
    installDismissed,
    pushSupported,
    notifPermission,
    hasSubscription,
    notifDismissed
  } = input;

  // --- Install step (shown before notification step) ---
  if (!isStandalone && !installDismissed) {
    if (isIos) return 'install-ios';
    if (canInstall) return 'install-prompt';
    return 'install-fallback';
  }

  // --- Notification step ---
  if (!pushSupported || notifPermission === 'unsupported') return 'none';
  if (hasSubscription || notifPermission === 'granted') return 'none';
  if (notifDismissed) return 'none';

  if (notifPermission === 'denied') return 'notif-denied';
  return 'notif-enable'; // permission is 'default'
}
