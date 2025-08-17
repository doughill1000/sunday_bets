export type TeamMeta = { name: string; colors: [string, string] };

// Minimal set to get you going; extend to all 32 later
export const TEAM_META: Record<string, TeamMeta> = {
  PHI: { name: 'Philadelphia Eagles', colors: ['#004C54', '#A5ACAF'] },
  DAL: { name: 'Dallas Cowboys',     colors: ['#041E42', '#869397'] },
  KC:  { name: 'Kansas City Chiefs', colors: ['#E31837', '#FFB81C'] },
  CIN: { name: 'Cincinnati Bengals', colors: ['#FB4F14', '#000000'] },
  BUF: { name: 'Buffalo Bills',      colors: ['#00338D', '#C60C30'] },
  NYJ: { name: 'New York Jets',      colors: ['#125740', '#FFFFFF'] },
  // …add the rest here when you like
};
