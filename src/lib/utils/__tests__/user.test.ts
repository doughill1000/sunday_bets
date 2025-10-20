import { describe, it, expect } from 'vitest';
import { userNameShort, shortName } from '../user';
import type { User } from '@supabase/supabase-js';

describe('user utils', () => {
  const baseUser = (overrides: Partial<User> = {}): User => ({
    id: 'id',
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    user_metadata: {},
    factors: [],
    identities: [],
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    ...overrides
  } as any);

  describe('userNameShort', () => {
    it('returns U for null', () => {
      expect(userNameShort(null)).toBe('U');
    });
    it('uses initials of full name', () => {
      const u = baseUser({ user_metadata: { full_name: 'Patrick Mahomes' }, email: 'pm@example.com' });
      expect(userNameShort(u)).toBe('PM');
    });
    it('falls back to email when no name', () => {
      const u = baseUser({ email: 'p@example.com' });
      expect(userNameShort(u)).toBe('P@'); // first two chars uppercased
    });
    it('handles single short name', () => {
      const u = baseUser({ user_metadata: { full_name: 'Bo' } });
      expect(userNameShort(u)).toBe('BO');
    });
    it('handles trailing spaces', () => {
      const u = baseUser({ user_metadata: { full_name: '  Taylor   Swift  ' } });
      expect(userNameShort(u)).toBe('TS');
    });
  });

  describe('shortName', () => {
    it('empty string for falsy', () => {
      expect(shortName('')).toBe('');
    });
    it('single word returns first two chars', () => {
      expect(shortName('Mahomes')).toBe('Ma');
    });
    it('multi word returns initials max 3', () => {
      expect(shortName('National Football League')).toBe('NFL');
      expect(shortName('Bo Jackson')).toBe('BJ');
    });
  });
});
