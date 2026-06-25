import { describe, it, expect } from 'vitest';
import { resolveActiveGroupId } from '$lib/server/group-resolver';

const GROUP_A = '00000000-0000-4000-8000-000000000001';
const GROUP_B = '00000000-0000-4000-8000-000000000002';
const GROUP_STALE = '00000000-0000-4000-8000-000000000099';

describe('resolveActiveGroupId', () => {
  it('returns null when the user has no active memberships', () => {
    expect(resolveActiveGroupId(null, [])).toBeNull();
    expect(resolveActiveGroupId(GROUP_A, [])).toBeNull();
  });

  it('returns the first active membership when cookie is absent', () => {
    expect(resolveActiveGroupId(null, [GROUP_A, GROUP_B])).toBe(GROUP_A);
    expect(resolveActiveGroupId(undefined, [GROUP_A])).toBe(GROUP_A);
  });

  it('returns the cookie value when it is a valid active membership', () => {
    expect(resolveActiveGroupId(GROUP_B, [GROUP_A, GROUP_B])).toBe(GROUP_B);
  });

  it('falls back to the first active membership when cookie is stale (group removed)', () => {
    expect(resolveActiveGroupId(GROUP_STALE, [GROUP_A, GROUP_B])).toBe(GROUP_A);
  });

  it('returns the single membership regardless of cookie value', () => {
    expect(resolveActiveGroupId(GROUP_STALE, [GROUP_A])).toBe(GROUP_A);
    expect(resolveActiveGroupId(GROUP_A, [GROUP_A])).toBe(GROUP_A);
  });
});
