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
  it('signedSpreadForTeam uses +/- from team perspective', () => {
    expect(signedSpreadForTeam(g(), 'home')).toBe(' -3.5'); // favorite
    expect(signedSpreadForTeam(g(), 'away')).toBe(' +3.5'); // dog
  });
});
