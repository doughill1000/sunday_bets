import { describe, it, expect } from 'vitest';
import { toDecimalNumber } from '../numbers';

describe('toDecimalNumber', () => {
  it('returns null for null/undefined', () => {
    expect(toDecimalNumber(undefined)).toBeNull();
    expect(toDecimalNumber(null)).toBeNull();
  });
  it('parses numeric strings', () => {
    expect(toDecimalNumber('12.34')).toBeCloseTo(12.34);
  });
  it('parses numbers directly', () => {
    expect(toDecimalNumber(10)).toBe(10);
  });
  it('returns null for non-numeric', () => {
    expect(toDecimalNumber('abc')).toBeNull();
    expect(toDecimalNumber({})).toBeNull();
  });
  it('handles leading/trailing spaces', () => {
    expect(toDecimalNumber('  5 ')).toBe(5);
  });
});
