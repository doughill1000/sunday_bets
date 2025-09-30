import { describe, it, expect } from 'vitest';
import { toResult, formatLockedSpread, gameLabel, gameScore } from '../leaderboard';

describe('leaderboard utils', () => {
  describe('toResult', () => {
    it('maps win/loss/push/missed', () => {
      expect(toResult('win')).toBe('W');
      expect(toResult('loss')).toBe('L');
      expect(toResult('push')).toBe('P');
      expect(toResult(undefined)).toBe('M');
      expect(toResult(null)).toBe('M');
  expect(toResult('other' as any)).toBe('M');
    });
  });

  describe('formatLockedSpread', () => {
    it('returns null when value missing', () => {
      expect(formatLockedSpread(null, 1, 1)).toBeNull();
      expect(formatLockedSpread(undefined, 1, 1)).toBeNull();
    });
    it('returns null for NaN', () => {
  expect(formatLockedSpread({} as any, 1, 1)).toBeNull();
    });
    it('renders PK for ~0 value', () => {
      expect(formatLockedSpread(0, 1, 1)).toBe('PK');
      expect(formatLockedSpread(1e-10, 1, 1)).toBe('PK');
      expect(formatLockedSpread(-1e-11, 2, 1)).toBe('PK');
    });
    it('negative when favorite picked', () => {
      expect(formatLockedSpread(7, 5, 5)).toBe('-7');
      expect(formatLockedSpread(-3.5, 8, 8)).toBe('-3.5');
    });
    it('positive when underdog picked', () => {
      expect(formatLockedSpread(7, 5, 6)).toBe('+7');
      expect(formatLockedSpread(-3.5, 8, 9)).toBe('+3.5');
    });
    it('coerces string values', () => {
  expect(formatLockedSpread('6.5' as any, '10' as any, '10' as any)).toBe('-6.5');
    });
  });

  describe('gameLabel', () => {
    it('uses fallbacks', () => {
      expect(gameLabel(null, null)).toBe('AWY @ HOME');
    });
    it('substitutes provided teams', () => {
      expect(gameLabel('KC', 'BUF')).toBe('KC @ BUF');
    });
  });

  describe('gameScore', () => {
    it('returns null for invalid', () => {
      expect(gameScore(null)).toBeNull();
      expect(gameScore('nope')).toBeNull();
      expect(gameScore({ home: 'x', away: 3 })).toBeNull();
    });
    it('formats valid score', () => {
      expect(gameScore({ home: 24, away: 17 })).toBe('17–24');
    });
  });
});
