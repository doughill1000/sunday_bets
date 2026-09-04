import { describe, it, expect } from 'vitest';
import { shouldAutoOpenDemoGuide } from '../demoGuide';

describe('shouldAutoOpenDemoGuide', () => {
  it('opens on the demo home', () => {
    expect(shouldAutoOpenDemoGuide('/demo')).toBe(true);
  });

  it('opens on another demo surface', () => {
    expect(shouldAutoOpenDemoGuide('/demo/stats')).toBe(true);
  });

  it('does not stack on the standalone full-rules page', () => {
    expect(shouldAutoOpenDemoGuide('/demo/how-to-play')).toBe(false);
  });
});
