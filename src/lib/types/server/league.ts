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

/** Favorite ATS cover counts for one spread-size bucket over a season (issue #426). Buckets
 *  partition games by the absolute team-relative spread: pick'em (0), 1-3, 3.5-6.5, 7-9.5,
 *  10+. `favoriteCovers` / `underdogCovers` are the favorite's ATS wins / losses (cover % is
 *  derived from them in the UI, pushes excluded). The pick'em bucket has no favorite, so its
 *  favoriteCovers/underdogCovers are 0 and only its `games` count is meaningful. */
export type LeagueSpreadBucket = {
  /** Sort order 0-4: 0=pick'em, 1=1-3, 2=3.5-6.5, 3=7-9.5, 4=10+. */
  bucketOrder: number;
  /** Display label: 'pickem' | '1-3' | '3.5-6.5' | '7-9.5' | '10+'. */
  bucket: string;
  /** Games in this bucket this season (the bucket's `n`). */
  games: number;
  /** Favorite ATS wins (favorite covered). Always 0 for the pick'em bucket. */
  favoriteCovers: number;
  /** Favorite ATS losses (underdog covered). Always 0 for the pick'em bucket. */
  underdogCovers: number;
  pushes: number;
};

/** One league-wide home/away × favorite/underdog quadrant for a season (issue #426): the
 *  four cover rates (home favorite, home underdog, road favorite, road underdog) aggregated
 *  across all teams. Grain is the team-perspective row, so each game contributes to two
 *  quadrants (one per side); pick'em games are excluded upstream. Cover % is derived from
 *  `ats` in the UI (pushes excluded), reusing the same helper as every other league module. */
export type LeagueQuadrant = {
  /** true = home-team games; false = road-team games. */
  isHome: boolean;
  /** true = the favored side; false = the underdog side. */
  isFavorite: boolean;
  /** Qualifying team-games in this quadrant this season (the quadrant's `n`). */
  games: number;
  ats: AtsRecord;
};

/** The kickoff slot a game is classified into by league_ats_primetime: the three night
 *  windows plus `day` for everything else. The slot is derived from the New-York wall-clock
 *  kickoff (DST-safe) in the view, not here. */
export type PrimetimeSlot = 'TNF' | 'SNF' | 'MNF' | 'day';

/** Favorite ATS cover counts for one kickoff slot in a season (league_ats_primetime, #425).
 *  Grain mirrors LeagueFavDogSplit — one favorite-perspective row per game — so
 *  favoriteCovers + underdogCovers + pushes = games and cover % excludes pushes. */
export type LeaguePrimetimeSlot = {
  slot: PrimetimeSlot;
  /** Games with a favorite that kicked off in this slot (pick'em games excluded upstream). */
  games: number;
  favoriteCovers: number;
  underdogCovers: number;
  pushes: number;
};

/** Favorite ATS cover counts split by divisional vs non-divisional matchup for a season
 *  (league_ats_divisional, #425). Same favorite-perspective grain as LeaguePrimetimeSlot;
 *  games where either side has no division/conference are excluded upstream. */
export type LeagueDivisionalSplit = {
  /** true = both teams share conference + division; false = any other NFL matchup. */
  isDivisional: boolean;
  games: number;
  favoriteCovers: number;
  underdogCovers: number;
  pushes: number;
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
  /** Favorite cover % by spread-size bucket (issue #426), pick'em first, then ascending. */
  spreadBuckets: LeagueSpreadBucket[];
  /** The four league-wide home/away × favorite/underdog cover rates (issue #426). */
  quadrants: LeagueQuadrant[];
  /** Favorite cover rate by kickoff slot (TNF/SNF/MNF/day), canonical order, #427. */
  primetime: LeaguePrimetimeSlot[];
  /** Favorite cover rate for divisional vs non-divisional matchups, #427. */
  divisional: LeagueDivisionalSplit[];
};
