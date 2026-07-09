import { describe, it, expect } from 'vitest';
import { LOCK_MOTION_MS, lockMotionMs } from '../motion';

describe('lockMotionMs', () => {
  it('uses the full lock-motion duration when motion is allowed', () => {
    expect(lockMotionMs(false)).toBe(LOCK_MOTION_MS);
  });

  it('collapses to 0 (instant, no motion) under prefers-reduced-motion', () => {
    expect(lockMotionMs(true)).toBe(0);
  });

  it('keeps the routine lock understated (well under half a second)', () => {
    // Guards the "quieter than the All-In signature moment" intent (ADR-0023):
    // if this ever creeps up to a celebratory length, this test should fail.
    expect(LOCK_MOTION_MS).toBeGreaterThan(0);
    expect(LOCK_MOTION_MS).toBeLessThanOrEqual(200);
  });
});
