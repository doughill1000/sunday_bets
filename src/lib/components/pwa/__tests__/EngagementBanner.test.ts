import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import EngagementBanner from '../EngagementBanner.svelte';

// Pin the install-ios branch: iOS, not standalone, install not dismissed.
vi.mock('$lib/pwa/client', () => ({
  isStandalone: () => false,
  isIos: () => true,
  isInstallDismissed: () => false,
  dismissInstall: () => {},
  isNotifDismissed: () => false,
  dismissNotif: () => {}
}));

// Keep onMount → computeStep() hermetic (no real beforeinstallprompt / push API).
vi.mock('$lib/pwa/install.svelte', () => ({
  installStore: { canInstall: false, deferredPrompt: null, promptInstall: async () => false }
}));

vi.mock('$lib/push/client', () => ({
  isPushSupported: () => false,
  notificationPermission: () => 'unsupported',
  hasPushSubscription: async () => false,
  subscribeToPush: async () => ({ ok: false })
}));

const user = { id: 'u1' } as any;

describe('EngagementBanner — install-ios', () => {
  it('renders the iOS install copy with a Share glyph', async () => {
    const { container } = render(EngagementBanner, { props: { user } });

    // onMount fires computeStep() asynchronously; wait for the copy to appear.
    expect(await screen.findByText('Add Sunday Bets to your Home Screen')).toBeInTheDocument();
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();

    // The Share glyph is an inline lucide SquareArrowUp <svg> wrapped with the word
    // "Share" in a no-wrap <strong> so glyph and word never line-break apart.
    const shareLabel = container.querySelector('strong.whitespace-nowrap');
    expect(shareLabel).not.toBeNull();
    expect(shareLabel).toHaveTextContent('Share');

    const glyph = shareLabel!.querySelector('svg');
    expect(glyph).not.toBeNull();
    expect(glyph).toHaveClass('inline');
    // Decorative — the adjacent text already says "Share".
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
  });
});
