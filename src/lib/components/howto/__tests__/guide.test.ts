import { describe, it, expect } from 'vitest';
import { shouldAutoOpenGuide } from '../guide';

describe('shouldAutoOpenGuide', () => {
  it('returns true when guideSeenAt is null and not on the how-to-play route', () => {
    expect(shouldAutoOpenGuide({ guideSeenAt: null, pathname: '/picks' })).toBe(true);
  });

  it('returns true when guideSeenAt is null and on an unrelated route', () => {
    expect(shouldAutoOpenGuide({ guideSeenAt: null, pathname: '/' })).toBe(true);
  });

  it('returns false when guideSeenAt is null but pathname starts with /how-to-play', () => {
    expect(shouldAutoOpenGuide({ guideSeenAt: null, pathname: '/how-to-play' })).toBe(false);
  });

  it('returns false when guideSeenAt is set', () => {
    expect(shouldAutoOpenGuide({ guideSeenAt: '2026-01-01T00:00:00Z', pathname: '/picks' })).toBe(
      false
    );
  });

  it('returns false when guideSeenAt is set and on the how-to-play route', () => {
    expect(
      shouldAutoOpenGuide({ guideSeenAt: '2026-01-01T00:00:00Z', pathname: '/how-to-play' })
    ).toBe(false);
  });
});
