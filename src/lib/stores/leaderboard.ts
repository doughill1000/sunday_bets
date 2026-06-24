import type { SeasonLeaderboardEntry } from '$lib/types/leaderboard';
import { writable } from 'svelte/store';

export const currentUserId = writable<string | null>(null);
export const seasonYearStore = writable<number | null>(null);
export const seasonTotalsStore = writable<SeasonLeaderboardEntry[]>([]);
