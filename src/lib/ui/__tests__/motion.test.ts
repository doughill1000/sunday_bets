import { describe, it, expect } from 'vitest';
import { LOCK_MOTION_MS, lockMotionMs } from '../motion';

describe('lockMotionMs', () => {
  it('uses the full lock-motion duration when motion is allowed', () => {
    expect(lockMotionMs(false)).toBe(LOCK_MOTION_MS);
  });

  it('collapses to 0 (instant, no motion) under prefers-reduced-motion', () => {
    expect(lockMotionMs(true)).toBe(0);
  });

  it('stays snapped to the --duration-base motion token', () => {
    // The routine lock rides the design-system motion ramp, not a bespoke number
    // (design-system.md §Motion / ADR-0029): --duration-base is 200ms. Keeping this
    // pinned also guards the "quieter than the All-In signature moment" intent
    // (ADR-0023) — a creep onto --duration-slow/-deliberate should fail here.
    expect(LOCK_MOTION_MS).toBe(200);
  });
});
