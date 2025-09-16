import { post } from '$lib/api';

export function gradeWeek(params: { week_id: number; refreshScores?: boolean }) {
  return post<{ ok: true; week_id: number }>('/api/admin/grade-week', params);
}

export function gradeGame(params: { game_id: string; refreshScores?: boolean }) {
  return post<{ ok: true; game_id: string }>('/api/admin/grade-game', params);
}

export function gradeSeason(params: { season_id: number; refreshScores?: boolean }) {
  return post<{ ok: true; season_id: number }>('/api/admin/grade-season', params);
}