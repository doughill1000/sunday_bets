import { describe, it, expect } from 'vitest';

// Sentry is real client SDK; stub lastEventId so the util is testable without init.
import { vi } from 'vitest';
vi.mock('@sentry/sveltekit', () => ({
  lastEventId: vi.fn(() => 'evt-123')
}));

import { buildFeedbackContext } from '../context';
import * as Sentry from '@sentry/sveltekit';

describe('buildFeedbackContext', () => {
  it('assembles route, build id, viewport, UA, sentry id, and group', () => {
    const ctx = buildFeedbackContext({ route: '/picks', groupId: 'g-1' });

    expect(ctx.route).toBe('/picks');
    expect(ctx.groupId).toBe('g-1');
    expect(ctx.sentryEventId).toBe('evt-123');
    expect(ctx.viewport).toEqual({ width: window.innerWidth, height: window.innerHeight });
    expect(ctx.userAgent).toBe(navigator.userAgent);
    // __BUILD_ID__ is a compile-time define; unit env falls back to 'unknown'.
    expect(typeof ctx.buildId).toBe('string');
  });

  it('null-safes a missing sentry event id and a null group', () => {
    (Sentry.lastEventId as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);

    const ctx = buildFeedbackContext({ route: '/', groupId: null });

    expect(ctx.sentryEventId).toBeNull();
    expect(ctx.groupId).toBeNull();
  });
});
