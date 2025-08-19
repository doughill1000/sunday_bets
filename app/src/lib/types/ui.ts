export type UIGame = {
  id: string;
  kickoff: string;
  away: string;
  home: string;
  spreadTeam: 'home' | 'away';
  spread: number;
};
