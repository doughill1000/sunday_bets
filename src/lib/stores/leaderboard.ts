import type { SeasonTotalsRow } from '$lib/types/server/leaderboard';
import { writable, derived } from 'svelte/store';

export const players = writable<{ id: string; display_name: string }[]>([]);
export const weeks = writable<number[]>([]);
export const activeWeekNumber = writable<number | null>(null);
export const currentUserId = writable<string | null>(null);
export const weekTotals = writable<Record<number, Record<string, number>>>({});
export const tableByWeek = writable<Record<number, any>>({});

export const seasonYearStore = writable<number | null>(null);
export const seasonTotalsStore = writable<SeasonTotalsRow[]>([]);

export const orderedPlayers = derived(
  [players, currentUserId],
  ([$players, $currentUserId]) =>
    $currentUserId
      ? [...$players].sort((a, b) =>
          a.id === $currentUserId ? -1 : b.id === $currentUserId ? 1 : 0
        )
      : $players
);