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

/** The kickoff slot a game is classified into by league_ats_primetime: the four night
 *  windows (Thu/Sat/Sun/Mon after 6pm ET) plus `day` for everything else. The slot is derived
 *  from the New-York wall-clock kickoff (DST-safe) in the view, not here. */
export type PrimetimeSlot = 'TNF' | 'SAT' | 'SNF' | 'MNF' | 'day';

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
  /** Per-team current ATS streak + last-4 form for the Hot/Cold module (issue #428). */
  streaks: LeagueTeamStreak[];
  /** Favorite cover % by spread-size bucket (issue #426), pick'em first, then ascending. */
  spreadBuckets: LeagueSpreadBucket[];
  /** The four league-wide home/away × favorite/underdog cover rates (issue #426). */
  quadrants: LeagueQuadrant[];
  /** Favorite cover rate by kickoff slot (TNF/SNF/MNF/day), canonical order, #427. */
  primetime: LeaguePrimetimeSlot[];
  /** Favorite cover rate for divisional vs non-divisional matchups, #427. */
  divisional: LeagueDivisionalSplit[];
};

/**
 * The pooled "Last N seasons" market-cuts payload for the /league Trends scope toggle (epic
 * #424). The same six league-wide cuts as `LeagueAts`, summed across the most-recent seasons
 * with data — the market-structure biases that survive roster turnover (spread size, home
 * field, favorite/underdog, primetime, divisional), which are too thin to read one season at
 * a time. The per-team table and Hot/Cold streaks are deliberately absent: a franchise's
 * 5-year record blends different rosters and regresses to ~50%, and a multi-season "streak"
 * is meaningless. Counts are pooled in TypeScript (see leagueTrends.ts) off the same
 * league_ats_* views, so no cover math is duplicated. `favDog` is derived from `quadrants`.
 */
export type LeagueTrends = {
  /** The seasons actually pooled (the ≤5 most recent with data), newest first. */
  seasonsCovered: number[];
  /** Qualifying scored games across the pooled seasons (home-perspective count, one per game). */
  totalGames: number;
  /** Pooled favorite/underdog cover aggregate (`weekNumber` null), derived from `quadrants`. */
  favDog: LeagueFavDogSplit;
  spreadBuckets: LeagueSpreadBucket[];
  homeAway: LeagueHomeAway | null;
  quadrants: LeagueQuadrant[];
  primetime: LeaguePrimetimeSlot[];
  divisional: LeagueDivisionalSplit[];
};

/** One side of a slate matchup: the team's display label and the situational ATS nugget
 *  that matches this game's current line — or `null` for a pick'em / no-line / thin-sample
 *  side (the nugget module's documented omissions). `games` is the quadrant's sample (n=). */
export type LeagueSlateSide = {
  label: string;
  nugget: { text: string; games: number } | null;
};

/** One upcoming game on the forward-looking slate (issue #429): the matchup, its kickoff,
 *  and each side's matching situational split. `gameId` deep-links to `/picks#game-<id>`.
 *  `isDivisional` marks a same-conference-and-division matchup (#692 — the one conversational
 *  tag folded into the slate from the retired Divisional slice). */
export type LeagueSlateGame = {
  gameId: string;
  kickoff: string;
  isDivisional: boolean;
  away: LeagueSlateSide;
  home: LeagueSlateSide;
};

/** The forward-looking slate for the upcoming scoring week (issue #429). Week- and
 *  line-sensitive: reflects the current line at load and is NOT season-cached like the
 *  graded modules (ADR-0017). `weekNumber` is null and `games` empty in the offseason, a
 *  bye, or a non-scoring week — the empty state. */
export type LeagueSlate = {
  seasonYear: number;
  weekNumber: number | null;
  games: LeagueSlateGame[];
};
