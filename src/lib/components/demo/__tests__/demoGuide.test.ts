import { describe, it, expect } from 'vitest';
import { shouldAutoOpenDemoGuide } from '../demoGuide';

describe('shouldAutoOpenDemoGuide', () => {
  it('opens for a first-time visitor on the demo home', () => {
    expect(shouldAutoOpenDemoGuide({ seen: null, pathname: '/demo' })).toBe(true);
  });

  it('opens for a first-time visitor on another demo surface', () => {
    expect(shouldAutoOpenDemoGuide({ seen: null, pathname: '/demo/stats' })).toBe(true);
  });

  it('does not open once the visitor is already reading the full rules', () => {
    expect(shouldAutoOpenDemoGuide({ seen: null, pathname: '/demo/how-to-play' })).toBe(false);
  });

  it('does not open when the visitor has dismissed it before', () => {
    expect(shouldAutoOpenDemoGuide({ seen: '2026-09-04T00:00:00Z', pathname: '/demo' })).toBe(
      false
    );
  });

  it('stays closed when both dismissed and on the rules page', () => {
    expect(
      shouldAutoOpenDemoGuide({ seen: '2026-09-04T00:00:00Z', pathname: '/demo/how-to-play' })
    ).toBe(false);
  });
});
