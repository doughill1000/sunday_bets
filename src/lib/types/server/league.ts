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

/** One team's ATS record in a single situational quadrant (home/away x favorite/underdog)
 *  for a season. Backs the pick-card nugget (issue #406 PR 2). Rows come from
 *  league_ats_situational, which — like the /league views — derives from the shared
 *  league_ats_base matview, so the tab and the nugget never compute cover math two ways. */
export type LeagueSituationalRecord = {
  teamId: number;
  /** true = the team's home games; false = road games. */
  isHome: boolean;
  /** true = favored by the line; false = underdog. Pick'em games are excluded upstream. */
  isFavorite: boolean;
  /** Games this team played in this exact quadrant this season (the nugget's n=). */
  games: number;
  ats: AtsRecord;
};

/** A team's current ATS cover streak and recent (last-4) form for the /league Hot/Cold
 *  module (issue #428). Rows come from league_ats_streaks (over league_ats_base). The push
 *  convention is the view's: a push carries no cover momentum, so it neither extends nor
 *  starts a run — `streakResult = 'push'` with `streakLength = 0` means the most-recent game
 *  was a push and the team is on no active streak. */
export type LeagueTeamStreak = {
  teamId: number;
  teamName: string;
  teamShortName: string;
  /** Direction of the current run: 'win' = cover streak, 'loss' = non-cover streak, 'push'
   *  = most-recent game was a push (no active streak, streakLength = 0). */
  streakResult: 'win' | 'loss' | 'push';
  /** Consecutive most-recent games sharing streakResult; 0 when streakResult is 'push'. */
  streakLength: number;
  /** ATS record over the four most-recent games (fewer early in a season). */
  last4: AtsRecord;
};

/** One graded game in a team's season log for the drill-down (issue #428), from the team's
 *  own perspective in league_ats_base. `spreadValue` and `margin` are team-relative
 *  (negative spread = this team favored; margin > 0 = this team covered, = 0 push). */
export type LeagueTeamGameLogEntry = {
  weekNumber: number;
  opponentTeamId: number;
  /** true = this team hosted; false = it was on the road. */
  isHome: boolean;
  /** Team-relative closing/active spread: negative = favored, positive = underdog, 0 = pick'em. */
  spreadValue: number;
  /** Team-relative cover margin in points: > 0 covered by that many, = 0 push, < 0 did not. */
  margin: number;
  atsResult: 'win' | 'loss' | 'push';
};

/** A single team's season-long ATS game log (issue #428). Lazily fetched per team when the
 *  drill-down opens; group- and user-independent like the rest of the /league surface. */
export type LeagueTeamGameLog = {
  teamId: number;
  seasonYear: number;
  games: LeagueTeamGameLogEntry[];
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
  /** Per-team current ATS streak + last-4 form for the Hot/Cold module (issue #428). */
  streaks: LeagueTeamStreak[];
};
