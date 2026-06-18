import { describe, it, expect } from 'vitest';
import { teamByAbbr, teamById, teamNameById, abbrById } from '../teams';
import { TEAM_META } from '$lib/types/domain';

describe('teams utils', () => {
  const sampleAbbr = Object.keys(TEAM_META)[0];
  const sampleMeta = TEAM_META[sampleAbbr];

  it('teamByAbbr returns undefined for falsy', () => {
    expect(teamByAbbr(undefined)).toBeUndefined();
    expect(teamByAbbr(null)).toBeUndefined();
    expect(teamByAbbr('')).toBeUndefined();
  });

  it('teamByAbbr returns meta for valid abbr', () => {
    expect(teamByAbbr(sampleAbbr)).toMatchObject({ id: sampleMeta.id, name: sampleMeta.name });
  });

  it('teamById resolves by number and string', () => {
    expect(teamById(sampleMeta.id)).toMatchObject({ id: sampleMeta.id, abbr: sampleAbbr });
    expect(teamById(String(sampleMeta.id))).toMatchObject({ id: sampleMeta.id, abbr: sampleAbbr });
    expect(teamById(null)).toBeUndefined();
  });

  it('teamNameById and abbrById helpers', () => {
    expect(teamNameById(sampleMeta.id)).toBe(sampleMeta.name);
    expect(abbrById(sampleMeta.id)).toBe(sampleAbbr);
  });
});
