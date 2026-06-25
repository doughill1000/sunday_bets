import { describe, it, expect } from 'vitest';
import { weightLabel, weightPoints } from '../scoring';

describe('scoring', () => {
  it('maps weight codes to labels', () => {
    expect(weightLabel('L')).toBe('Low');
    expect(weightLabel('A')).toBe('All-In');
  });

  it('maps weight codes to points', () => {
    expect(weightPoints('L')).toBe(1);
    expect(weightPoints('M')).toBe(3);
    expect(weightPoints('H')).toBe(5);
    expect(weightPoints('A')).toBe(10);
  });
});
