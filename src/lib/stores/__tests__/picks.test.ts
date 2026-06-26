import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { picks, setPicks, lockPick } from '../picks';

// ---- Mock $lib/api/picks ----------------------------------------------------

vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn()
}));

async function getApiMock() {
  const mod = await import('$lib/api/picks');
  return mod.lockPick as ReturnType<typeof vi.fn>;
}

// ---- Helpers -----------------------------------------------------------------

const GAME_ID = 'game-unit-001';
const LOCKED_AT = '2025-09-01T00:00:00Z';

function seedStaged() {
  setPicks({ [GAME_ID]: { selected: { team: 'home', weight: 'M' } } });
}

// ---- Tests -------------------------------------------------------------------

describe('picks store — lockPick', () => {
  beforeEach(() => {
    setPicks({});
    vi.clearAllMocks();
  });

  it('full success: commits lockedPick, clears saveError, no saveError set', async () => {
    const apiMock = await getApiMock();
    apiMock.mockResolvedValue({
      ok: true,
      locked_at: LOCKED_AT,
      applied: 2,
      skipped: []
    });
    seedStaged();

    const result = await lockPick(GAME_ID);

    expect(result.ok).toBe(true);
    const entry = get(picks)[GAME_ID];
    expect(entry.lockedPick).toEqual({ team: 'home', weight: 'M' });
    expect(entry.lockedAt).toBe(LOCKED_AT);
    expect(entry.saveState).toBeUndefined();
    expect(entry.saveError).toBeUndefined();
  });

  it('partial-apply: commits lockedPick AND sets saveError warning when skipped > 0', async () => {
    const apiMock = await getApiMock();
    apiMock.mockResolvedValue({
      ok: true,
      locked_at: LOCKED_AT,
      applied: 1,
      skipped: [{ groupId: 'group-x', reason: 'no active line' }]
    });
    seedStaged();

    const result = await lockPick(GAME_ID);

    expect(result.ok).toBe(true);
    const entry = get(picks)[GAME_ID];
    // pick is committed (applied to at least one group)
    expect(entry.lockedPick).toEqual({ team: 'home', weight: 'M' });
    expect(entry.lockedAt).toBe(LOCKED_AT);
    expect(entry.saveState).toBeUndefined();
    // non-blocking warning is surfaced
    expect(entry.saveError).toMatch(/couldn.t apply to 1 group/i);
  });

  it('partial-apply: saveError message pluralises correctly for >1 skipped group', async () => {
    const apiMock = await getApiMock();
    apiMock.mockResolvedValue({
      ok: true,
      locked_at: LOCKED_AT,
      applied: 1,
      skipped: [
        { groupId: 'group-x', reason: 'no active line' },
        { groupId: 'group-y', reason: 'all in already used' }
      ]
    });
    seedStaged();

    await lockPick(GAME_ID);

    const entry = get(picks)[GAME_ID];
    expect(entry.saveError).toMatch(/couldn.t apply to 2 groups/i);
  });

  it('hard failure: restores before-state and sets saveError, does NOT commit lockedPick', async () => {
    const apiMock = await getApiMock();
    apiMock.mockResolvedValue({ ok: false, reason: 'Game already started.' });
    seedStaged();

    const result = await lockPick(GAME_ID);

    expect(result.ok).toBe(false);
    const entry = get(picks)[GAME_ID];
    expect(entry.lockedPick).toBeUndefined();
    expect(entry.saveState).toBe('error');
    expect(entry.saveError).toBe('Game already started.');
  });

  it('missing team/weight: returns early without calling the API', async () => {
    const apiMock = await getApiMock();
    setPicks({ [GAME_ID]: {} });

    const result = await lockPick(GAME_ID);

    expect(result.ok).toBe(false);
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('All-In partial-apply: lock is committed and warning surfaced', async () => {
    const apiMock = await getApiMock();
    apiMock.mockResolvedValue({
      ok: true,
      locked_at: LOCKED_AT,
      applied: 1,
      skipped: [{ groupId: 'group-allin', reason: 'All-In already used this week.' }]
    });
    setPicks({ [GAME_ID]: { selected: { team: 'away', weight: 'A' } } });

    const result = await lockPick(GAME_ID);

    expect(result.ok).toBe(true);
    const entry = get(picks)[GAME_ID];
    expect(entry.lockedPick).toEqual({ team: 'away', weight: 'A' });
    expect(entry.saveError).toBeTruthy();
  });
});
