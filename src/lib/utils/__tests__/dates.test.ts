import { describe, it, expect } from 'vitest';
import { isoNoMs } from '../dates';

describe('isoNoMs', () => {
  it('formats UTC date without milliseconds', () => {
    const d = new Date(Date.UTC(2024, 0, 2, 3, 4, 5, 678));
    expect(isoNoMs(d)).toBe('2024-01-02T03:04:05Z');
  });

  it('pads single digit components', () => {
    const d = new Date(Date.UTC(2024, 8, 9, 7, 6, 5)); // Sep 9
    expect(isoNoMs(d)).toBe('2024-09-09T07:06:05Z');
  });
});
