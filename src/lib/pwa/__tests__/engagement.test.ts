import { describe, it, expect } from 'vitest';
import { chooseEngagementStep, type EngagementInput } from '../engagement';

const base: EngagementInput = {
  isStandalone: false,
  isIos: false,
  canInstall: false,
  installDismissed: false,
  pushSupported: false,
  notifPermission: 'unsupported',
  hasSubscription: false,
  notifDismissed: false
};

describe('chooseEngagementStep — install steps', () => {
  it('returns install-ios for iOS non-standalone', () => {
    expect(chooseEngagementStep({ ...base, isIos: true })).toBe('install-ios');
  });

  it('returns install-prompt when beforeinstallprompt captured', () => {
    expect(chooseEngagementStep({ ...base, canInstall: true })).toBe('install-prompt');
  });

  it('returns none when not iOS and no prompt captured', () => {
    expect(chooseEngagementStep(base)).toBe('none');
  });

  it('returns none when already standalone', () => {
    expect(chooseEngagementStep({ ...base, isStandalone: true, pushSupported: false })).toBe(
      'none'
    );
  });

  it('skips install step when dismissed', () => {
    expect(chooseEngagementStep({ ...base, installDismissed: true, pushSupported: false })).toBe(
      'none'
    );
  });
});

describe('chooseEngagementStep — notification steps (install already resolved)', () => {
  const installed: EngagementInput = {
    ...base,
    isStandalone: true,
    pushSupported: true,
    notifPermission: 'default',
    hasSubscription: false,
    notifDismissed: false
  };

  it('returns notif-enable when permission is default and not dismissed', () => {
    expect(chooseEngagementStep(installed)).toBe('notif-enable');
  });

  it('returns notif-denied when permission is denied', () => {
    expect(chooseEngagementStep({ ...installed, notifPermission: 'denied' })).toBe('notif-denied');
  });

  it('returns none when already subscribed', () => {
    expect(chooseEngagementStep({ ...installed, hasSubscription: true })).toBe('none');
  });

  it('returns none when permission is granted (even without subscription check)', () => {
    expect(chooseEngagementStep({ ...installed, notifPermission: 'granted' })).toBe('none');
  });

  it('returns none when notif dismissed', () => {
    expect(chooseEngagementStep({ ...installed, notifDismissed: true })).toBe('none');
  });

  it('returns none when push not supported', () => {
    expect(chooseEngagementStep({ ...installed, pushSupported: false })).toBe('none');
  });
});

describe('chooseEngagementStep — install dismissed reveals notification step', () => {
  it('shows notif-enable after install is dismissed', () => {
    expect(
      chooseEngagementStep({
        ...base,
        installDismissed: true,
        pushSupported: true,
        notifPermission: 'default',
        hasSubscription: false,
        notifDismissed: false
      })
    ).toBe('notif-enable');
  });
});
