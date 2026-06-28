import { describe, it, expect } from 'vitest';
import { validateDisplayName } from '$lib/server/profile-validation';

describe('validateDisplayName', () => {
  it('accepts a valid name', () => {
    const r = validateDisplayName('Doug');
    expect(r).toEqual({ ok: true, value: 'Doug' });
  });

  it('trims surrounding whitespace', () => {
    const r = validateDisplayName('  Alice  ');
    expect(r).toEqual({ ok: true, value: 'Alice' });
  });

  it('rejects an empty string', () => {
    const r = validateDisplayName('');
    expect(r).toMatchObject({ ok: false });
  });

  it('rejects a whitespace-only string', () => {
    const r = validateDisplayName('   ');
    expect(r).toMatchObject({ ok: false });
  });

  it('rejects a name over 40 chars', () => {
    const r = validateDisplayName('a'.repeat(41));
    expect(r).toMatchObject({ ok: false });
  });

  it('accepts a name of exactly 40 chars', () => {
    const name = 'a'.repeat(40);
    const r = validateDisplayName(name);
    expect(r).toEqual({ ok: true, value: name });
  });

  it('rejects non-string values', () => {
    expect(validateDisplayName(null)).toMatchObject({ ok: false });
    expect(validateDisplayName(undefined)).toMatchObject({ ok: false });
    expect(validateDisplayName(42)).toMatchObject({ ok: false });
  });
});
