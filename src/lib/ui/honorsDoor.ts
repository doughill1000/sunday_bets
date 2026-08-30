/**
 * What the `/league` honors door says, and when it has something new (#867).
 *
 * The door (`HonorsStrip`) used to render only when a reigning champion existed, so it was
 * dark for the whole in-season stretch and for every league that had never finished a
 * season — exactly when the room is otherwise most alive. This module holds the two pure
 * decisions that make it evergreen, keyed on the **viewed** season's data-state, the rule
 * `DESIGN.md` already codifies ("a crowned season leads with its crown; otherwise the last
 * graded thing"):
 *
 * 1. `selectHonorsDoorState` — crowned → settled title → plain "Trophy room".
 * 2. `honorsNewCount` + the `localStorage` marker — how many graded weeks of room content
 *    have landed since this device last opened the room.
 *
 * **Freshness grain is the graded week.** Neither the trophy case nor a badge carries a
 * per-item settle timestamp, so a true per-item count has nothing to count. The last graded
 * week is the finest signal the page already holds (`pageData.trend`), and both the door's
 * line and the pip ride it, so they can never disagree about how current the room is. If a
 * per-item signal ever lands, the count narrows without the door's shape changing.
 */
import { BADGE_GLOSSARY } from '$lib/domain/badges';
import type { BadgeAward, BadgeId, SeasonHonor } from '$lib/types/honors';

/** The three things the door can be, discriminated so the component renders one branch. */
export type HonorsDoorState =
  /** The viewed season has a champion: lead with the crown. */
  | { kind: 'crowned'; champion: SeasonHonor }
  /** No crown yet, but the room holds a settled title — the freshest thing it can name. */
  | {
      kind: 'settled';
      emoji: string;
      label: string;
      holderName: string;
      holderUserId: string;
      /** Last graded week of the viewed season, or 0 when the page has no trend. */
      throughWeek: number;
    }
  /** Nothing has settled yet. The door still opens; it just has nothing to announce. */
  | { kind: 'empty' };

/**
 * Which title the door names when it has several to choose from.
 *
 * Week Winner leads because it is the only title with week grain — it re-decides every time
 * a week grades, which is the same clock the pip counts on, so "freshest" is literally true
 * of it. The rest follow `BADGE_GLOSSARY`'s canonical presentation order, so the pick is
 * stable regardless of the order the engine happened to push awards in.
 *
 * Titles only: a title has exactly one holder, which is what a one-line door can name. A
 * milestone can have any number of holders (or none) and would need a list.
 */
const DOOR_TITLE_PRIORITY: readonly BadgeId[] = [
  'week-winner',
  ...BADGE_GLOSSARY.filter((g) => g.kind === 'title' && g.id !== 'week-winner').map((g) => g.id)
];

export type HonorsDoorInput = {
  /** The viewed season's trophy-case entry, or null while that season has no champion. */
  viewedChampion: SeasonHonor | null;
  /** The viewed season's awards, as the honors card receives them. */
  badges: BadgeAward[];
  /** Last graded week of the viewed season (0 before the first grade). */
  lastGradedWeek: number;
};

export function selectHonorsDoorState({
  viewedChampion,
  badges,
  lastGradedWeek
}: HonorsDoorInput): HonorsDoorState {
  if (viewedChampion) return { kind: 'crowned', champion: viewedChampion };

  const titles = new Map(
    badges.filter((b) => b.kind === 'title' && b.holders.length > 0).map((b) => [b.id, b])
  );
  for (const id of DOOR_TITLE_PRIORITY) {
    const badge = titles.get(id);
    if (!badge) continue;
    const holder = badge.holders[0];
    return {
      kind: 'settled',
      emoji: badge.emoji,
      label: badge.label,
      holderName: holder.display_name,
      holderUserId: holder.user_id,
      throughWeek: lastGradedWeek
    };
  }

  return { kind: 'empty' };
}

// The seen marker is per-device on purpose: the pip is a cosmetic "you haven't looked since
// this graded" convenience, not a notification. Nothing about it belongs in the database, and
// a fresh device simply starts its own count (see `honorsNewCount`).
const SEEN_KEY_PREFIX = 'sb:honors-seen:v1';

/** One marker per (group, season): browsing 2023 never clears the live season's pip. */
export function honorsSeenKey(groupId: string, seasonYear: number): string {
  return `${SEEN_KEY_PREFIX}:${groupId}:${seasonYear}`;
}

/**
 * The graded week this device last saw the room at, or null when it never has.
 *
 * Returns null rather than throwing on private-mode storage, a cleared origin, or SSR —
 * every caller treats null as "unknown", which is the same thing a first visit means.
 */
export function readHonorsSeenWeek(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const week = Number.parseInt(raw, 10);
    return Number.isFinite(week) && week >= 0 ? week : null;
  } catch {
    return null;
  }
}

/** Record the graded week this device has now seen. Silently a no-op when storage throws. */
export function writeHonorsSeenWeek(key: string, week: number): void {
  try {
    localStorage.setItem(key, String(week));
  } catch {
    // private browsing or storage quota — the pip degrades to never firing, never to an error
  }
}

/**
 * How many graded weeks of room content have landed since this device last looked.
 *
 * A device with no marker counts **zero**, not everything: on a first sight we genuinely
 * don't know what the member has already seen, and opening `/league` to "6 new" would be
 * noise that the pip can never earn back. The caller seeds the marker on that first sight,
 * so the pip fires from the next graded week onward and never lies.
 */
export function honorsNewCount(lastGradedWeek: number, seenWeek: number | null): number {
  if (seenWeek === null) return 0;
  return Math.max(0, lastGradedWeek - seenWeek);
}
