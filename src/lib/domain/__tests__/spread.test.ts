// tests/domain/spread.test.ts
import { describe, it, expect } from 'vitest';
import { spreadLine, signedSpreadForTeam } from '../../domain/spread';
import type { PickGame } from '../../types/games';

const g = (overrides: Partial<PickGame> = {}): PickGame => ({
  id: 'g1',
  kickoff: '2025-09-14T17:00:00Z',
  home: 'CIN',
  away: 'JAX',
  homeTeamId: 1,
  awayTeamId: 2,
  spreadTeamId: 1,
  spreadValue: 3.5,
  ...overrides
});

describe('spread helpers', () => {
  it('spreadLine prints favorite and number', () => {
    expect(spreadLine(g())).toBe('CIN -3.5');
  });
  it('PK when spreadValue is 0', () => {
    expect(spreadLine(g({ spreadValue: 0 }))).toBe('PK');
  });
  it('No line when null', () => {
    expect(spreadLine(g({ spreadValue: null as any }))).toBe('No line');
  });
  it('spreadLine handles negative spreadValue without double-minus (regression)', () => {
    // DB may store the active line as a negative number for the favorite side.
    expect(spreadLine(g({ spreadValue: -3.5 }))).toBe('CIN -3.5');
  });
  it('spreadLine away team as favorite', () => {
    expect(spreadLine(g({ spreadTeamId: 2 }))).toBe('JAX -3.5');
  });

  it('signedSpreadForTeam uses +/- from team perspective', () => {
    expect(signedSpreadForTeam(g(), 'home')).toBe(' -3.5'); // favorite
    expect(signedSpreadForTeam(g(), 'away')).toBe(' +3.5'); // dog
  });
  it('signedSpreadForTeam handles negative spreadValue without double-minus (regression)', () => {
    expect(signedSpreadForTeam(g({ spreadValue: -3.5 }), 'home')).toBe(' -3.5');
    expect(signedSpreadForTeam(g({ spreadValue: -3.5 }), 'away')).toBe(' +3.5');
  });
  it('signedSpreadForTeam returns PK when spreadValue is 0', () => {
    expect(signedSpreadForTeam(g({ spreadValue: 0 }), 'home')).toBe(' PK');
    expect(signedSpreadForTeam(g({ spreadValue: 0 }), 'away')).toBe(' PK');
  });
  it('signedSpreadForTeam returns empty string when null', () => {
    expect(signedSpreadForTeam(g({ spreadValue: null as any }), 'home')).toBe('');
  });
});
