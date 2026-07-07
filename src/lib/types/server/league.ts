// Client-safe shapes for the league-wide team ATS surface (/league, issue #406).
//
// League ATS is descriptive, league-wide context: identical for every user, with no
// group_id / user_id dimension (unlike the personal Stats/Leaderboard types). These types
// are shared by the server read model, the `/api/league` route, and the page component; the
// underlying rows live in the league_ats_* views (see supabase/src/views/league_ats_*.sql).

/** A win/loss/push tally. Cover % is derived from it in the UI (pushes excluded). */
export type AtsRecord = {
  wins: number;
  losses: number;
  pushes: number;
};

/** One team's season ATS record, with home/away and favorite/underdog ATS splits and the
 *  overall straight-up (moneyline) record. Backs the per-team table and, in PR 2, the
 *  pick-card nugget's situational quadrant lookup. */
export type LeagueTeamAts = {
  teamId: number;
  teamName: string;
  teamShortName: string;
  /** Qualifying scored games this team played this season. */
  games: number;
  /** Overall ATS record (against the closing/active line). */
  ats: AtsRecord;
  /** Overall straight-up (win/loss/tie) record. */
  su: AtsRecord;
  /** ATS record in home games. */
  home: AtsRecord;
  /** ATS record in road games. */
  away: AtsRecord;
  /** ATS record when favored by the line (pick'em games excluded). */
  favorite: AtsRecord;
  /** ATS record when an underdog (pick'em games excluded). */
  underdog: AtsRecord;
};

/** Favorite-vs-underdog cover counts for one scoring week, or (weekNumber = null) the
 *  season aggregate. favoriteCovers + underdogCovers + pushes = games. */
export type LeagueFavDogSplit = {
  /** null for the season aggregate row; otherwise the NFL week number. */
  weekNumber: number | null;
  /** Games that had a favorite (pick'em games excluded). */
  games: number;
  favoriteCovers: number;
  underdogCovers: number;
  pushes: number;
};

/** League-wide home vs. road ATS and straight-up splits for a season. */
export type LeagueHomeAway = {
  home: { games: number; ats: AtsRecord; su: AtsRecord };
  away: { games: number; ats: AtsRecord; su: AtsRecord };
};

/** The full /league payload for one season. `totalGames` is the number of qualifying
 *  scored games with a line (drives the "n games scored" caveat on thin/older seasons). */
export type LeagueAts = {
  seasonYear: number;
  totalGames: number;
  teams: LeagueTeamAts[];
  favDogSeason: LeagueFavDogSplit;
  favDogByWeek: LeagueFavDogSplit[];
  homeAway: LeagueHomeAway | null;
};
