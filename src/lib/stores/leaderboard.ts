import type {
  LeaderboardPlayer,
  SeasonLeaderboardEntry,
  WeeklyLeaderboard
} from '$lib/types/leaderboard';
import { writable, derived } from 'svelte/store';

export const players = writable<LeaderboardPlayer[]>([]);
export const weeks = writable<number[]>([]);
export const activeWeekNumber = writable<number | null>(null);
export const currentUserId = writable<string | null>(null);
export const weekTotals = writable<Record<number, Record<string, number>>>({});
export const tableByWeek = writable<Record<number, WeeklyLeaderboard>>({});

export const seasonYearStore = writable<number | null>(null);
export const seasonTotalsStore = writable<SeasonLeaderboardEntry[]>([]);

export const orderedPlayers = derived([players, currentUserId], ([$players, $currentUserId]) =>
  $currentUserId
    ? [...$players].sort((a, b) => (a.id === $currentUserId ? -1 : b.id === $currentUserId ? 1 : 0))
    : $players
);
