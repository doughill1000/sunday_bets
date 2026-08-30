// The evergreen honors door's two decisions (#867): what the door says about the viewed
// season, and how many graded weeks of room content this device hasn't seen.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  selectHonorsDoorState,
  honorsSeenKey,
  honorsNewCount,
  readHonorsSeenWeek,
  writeHonorsSeenWeek
} from '../honorsDoor';
import type { BadgeAward, SeasonHonor } from '$lib/types/honors';

const CHAMPION: SeasonHonor = {
  season_year: 2025,
  user_id: 'u1',
  display_name: 'Doug',
  avatar_key: null,
  rank: 1,
  total_points: 118
};

function title(id: BadgeAward['id'], label: string, holder: string): BadgeAward {
  return {
    id,
    label,
    emoji: '🏆',
    flavor: '',
    description: '',
    kind: 'title',
    holders: [{ user_id: `${holder}-id`, display_name: holder }]
  };
}

describe('selectHonorsDoorState', () => {
  it('leads with the crown when the viewed season has a champion', () => {
    const state = selectHonorsDoorState({
      viewedChampion: CHAMPION,
      badges: [title('the-whale', 'The Whale', 'Alex')],
      lastGradedWeek: 18
    });
    expect(state).toEqual({ kind: 'crowned', champion: CHAMPION });
  });

  it('names a settled title while the viewed season has no champion yet', () => {
    const state = selectHonorsDoorState({
      viewedChampion: null,
      badges: [title('the-whale', 'The Whale', 'Alex')],
      lastGradedWeek: 6
    });
    expect(state).toMatchObject({
      kind: 'settled',
      label: 'The Whale',
      holderName: 'Alex',
      throughWeek: 6
    });
  });

  it('prefers Week Winner — the one title with week grain — over other titles', () => {
    // Order in the badges array must not decide it: the door's pick is the freshest measure,
    // not whatever the engine happened to push first.
    const state = selectHonorsDoorState({
      viewedChampion: null,
      badges: [
        title('the-whale', 'The Whale', 'Alex'),
        title('week-winner', 'Week Winner', 'Nate')
      ],
      lastGradedWeek: 6
    });
    expect(state).toMatchObject({ kind: 'settled', label: 'Week Winner', holderName: 'Nate' });
  });

  it('ignores milestones and unheld titles — a door line can only name one holder', () => {
    const milestone: BadgeAward = {
      ...title('the-grinder', 'The Grinder', 'Alex'),
      kind: 'milestone'
    };
    const unheld: BadgeAward = { ...title('oracle', 'Oracle', 'Nate'), holders: [] };
    const state = selectHonorsDoorState({
      viewedChampion: null,
      badges: [milestone, unheld],
      lastGradedWeek: 6
    });
    expect(state).toEqual({ kind: 'empty' });
  });

  it('degrades to the plain door when nothing has settled', () => {
    expect(selectHonorsDoorState({ viewedChampion: null, badges: [], lastGradedWeek: 0 })).toEqual({
      kind: 'empty'
    });
  });
});

describe('honorsNewCount', () => {
  it('counts graded weeks landed since this device last looked', () => {
    expect(honorsNewCount(6, 4)).toBe(2);
  });

  it('counts nothing on a device that has never seen the room', () => {
    // A first sight seeds the marker instead of announcing every week that ever graded.
    expect(honorsNewCount(6, null)).toBe(0);
  });

  it('never goes negative when the viewed season rolls back behind the marker', () => {
    expect(honorsNewCount(3, 6)).toBe(0);
  });

  it('is zero once the room has been seen at the current week', () => {
    expect(honorsNewCount(6, 6)).toBe(0);
  });
});

describe('the seen marker', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scopes the marker to one group and season', () => {
    expect(honorsSeenKey('g1', 2025)).not.toBe(honorsSeenKey('g1', 2024));
    expect(honorsSeenKey('g1', 2025)).not.toBe(honorsSeenKey('g2', 2025));
  });

  it('round-trips a week', () => {
    const key = honorsSeenKey('g1', 2025);
    writeHonorsSeenWeek(key, 6);
    expect(readHonorsSeenWeek(key)).toBe(6);
  });

  it('reads null for an unseen room and for a corrupted value', () => {
    const key = honorsSeenKey('g1', 2025);
    expect(readHonorsSeenWeek(key)).toBeNull();
    localStorage.setItem(key, 'not-a-week');
    expect(readHonorsSeenWeek(key)).toBeNull();
  });

  it('never throws when storage is unavailable (private mode)', () => {
    const key = honorsSeenKey('g1', 2025);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => writeHonorsSeenWeek(key, 6)).not.toThrow();
    expect(readHonorsSeenWeek(key)).toBeNull();
  });
});
