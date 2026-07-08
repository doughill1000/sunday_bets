import { post } from '$lib/api';

/** Settlement counts every grader returns, so the admin UI can summarise the run. */
export type GradeResult = {
  ok: true;
  gamesGraded: number;
  picksSettled: number;
};

export function gradeWeek(params: { week_id: number; refreshScores?: boolean }) {
  return post<GradeResult & { week_id: number }>('/api/admin/grade-week', params);
}

export function gradeGame(params: { game_id: string; refreshScores?: boolean }) {
  return post<GradeResult & { game_id: string }>('/api/admin/grade-game', params);
}

export function gradeSeason(params: { season_id: number; refreshScores?: boolean }) {
  return post<GradeResult & { season_id: number }>('/api/admin/grade-season', params);
}
