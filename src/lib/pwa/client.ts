// Platform detection and localStorage dismissal helpers for PWA engagement prompts.

const INSTALL_DISMISS_KEY = 'sb:pwa:install-dismissed:v1';
const NOTIF_DISMISS_KEY = 'sb:pwa:notif-dismissed:v1';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh with touch support
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

function safeGet(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function safeSet(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // private browsing or storage quota — silently ignore
  }
}

export function isInstallDismissed(): boolean {
  return safeGet(INSTALL_DISMISS_KEY);
}

export function dismissInstall(): void {
  safeSet(INSTALL_DISMISS_KEY);
}

export function isNotifDismissed(): boolean {
  return safeGet(NOTIF_DISMISS_KEY);
}

export function dismissNotif(): void {
  safeSet(NOTIF_DISMISS_KEY);
}
