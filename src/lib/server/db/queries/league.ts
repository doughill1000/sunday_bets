import { supabaseService } from '$lib/supabase/service';
import type { Tables } from '$lib/types/supabase';
import type {
  AtsRecord,
  LeagueAts,
  LeagueFavDogSplit,
  LeagueHomeAway,
  LeagueSituationalRecord,
  LeagueSlate,
  LeagueTeamAts
} from '$lib/types/server/league';
import { buildSlateGames } from '$lib/utils/leagueSlate';
import { findActiveWeek } from './findActiveWeek';
import { getGamesWithActiveLines } from './getGamesWithActiveLines';

type TeamRow = Tables<'league_ats_team'>;
type FavDogRow = Tables<'league_ats_fav_dog'>;
type HomeAwayRow = Tables<'league_ats_home_away'>;

// Matview/view columns are all nullable in the generated types; a present row never has
// null counts, so coalesce to 0 rather than dropping rows on a spurious null.
const n = (v: number | null): number => v ?? 0;
const rec = (wins: number | null, losses: number | null, pushes: number | null): AtsRecord => ({
  wins: n(wins),
  losses: n(losses),
  pushes: n(pushes)
});

function toTeam(row: TeamRow): LeagueTeamAts | null {
  // team_id / names are non-null in practice (the view joins teams); guard the types.
  if (row.team_id == null || row.team_name == null || row.team_short_name == null) return null;
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    teamShortName: row.team_short_name,
    games: n(row.games),
    ats: rec(row.ats_wins, row.ats_losses, row.ats_pushes),
    su: rec(row.su_wins, row.su_losses, row.su_pushes),
    home: rec(row.home_ats_wins, row.home_ats_losses, row.home_ats_pushes),
    away: rec(row.away_ats_wins, row.away_ats_losses, row.away_ats_pushes),
    favorite: rec(row.fav_ats_wins, row.fav_ats_losses, row.fav_ats_pushes),
    underdog: rec(row.dog_ats_wins, row.dog_ats_losses, row.dog_ats_pushes)
  };
}

function toFavDogWeek(row: FavDogRow): LeagueFavDogSplit {
  return {
    weekNumber: row.week_number,
    games: n(row.games),
    favoriteCovers: n(row.favorite_covers),
    underdogCovers: n(row.underdog_covers),
    pushes: n(row.pushes)
  };
}

function sumFavDog(weeks: LeagueFavDogSplit[]): LeagueFavDogSplit {
  return weeks.reduce<LeagueFavDogSplit>(
    (acc, w) => ({
      weekNumber: null,
      games: acc.games + w.games,
      favoriteCovers: acc.favoriteCovers + w.favoriteCovers,
      underdogCovers: acc.underdogCovers + w.underdogCovers,
      pushes: acc.pushes + w.pushes
    }),
    { weekNumber: null, games: 0, favoriteCovers: 0, underdogCovers: 0, pushes: 0 }
  );
}

function toHomeAway(row: HomeAwayRow): LeagueHomeAway {
  return {
    home: {
      games: n(row.home_games),
      ats: rec(row.home_ats_covers, row.home_ats_losses, row.home_ats_pushes),
      su: rec(row.home_su_wins, row.home_su_losses, row.home_su_pushes)
    },
    away: {
      games: n(row.away_games),
      ats: rec(row.away_ats_covers, row.away_ats_losses, row.away_ats_pushes),
      su: rec(row.away_su_wins, row.away_su_losses, row.away_su_pushes)
    }
  };
}

/**
 * The seasons that have any league ATS data, newest first. Read off league_ats_home_away
 * (exactly one row per season with qualifying games), so the /league season selector only
 * offers seasons that will actually render.
 */
export async function getLeagueSeasons(): Promise<number[]> {
  const { data, error } = await supabaseService
    .from('league_ats_home_away')
    .select('season_year')
    .order('season_year', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((r) => (r.season_year == null ? [] : [r.season_year]));
}

/**
 * League-wide team ATS for one season: the per-team table, the favorite/underdog module
 * (season aggregate + per-week breakdown), and the home/away module. All three read the
 * league_ats_* views, which derive from the single league_ats_base matview — no aggregation
 * is duplicated. Group-independent: identical for every user (ADR-0013 service-role read).
 */
export async function getLeagueAts(seasonYear: number): Promise<LeagueAts> {
  const [teamResult, favDogResult, homeAwayResult] = await Promise.all([
    supabaseService
      .from('league_ats_team')
      .select('*')
      .eq('season_year', seasonYear)
      .order('team_short_name'),
    supabaseService
      .from('league_ats_fav_dog')
      .select('*')
      .eq('season_year', seasonYear)
      .order('week_number'),
    supabaseService
      .from('league_ats_home_away')
      .select('*')
      .eq('season_year', seasonYear)
      .maybeSingle()
  ]);

  if (teamResult.error) throw teamResult.error;
  if (favDogResult.error) throw favDogResult.error;
  if (homeAwayResult.error) throw homeAwayResult.error;

  const teams = (teamResult.data ?? []).flatMap((row) => {
    const entry = toTeam(row);
    return entry ? [entry] : [];
  });
  const favDogByWeek = (favDogResult.data ?? []).map(toFavDogWeek);
  const homeAway = homeAwayResult.data ? toHomeAway(homeAwayResult.data) : null;

  return {
    seasonYear,
    // Qualifying scored games = the home-perspective count (one home row per game).
    totalGames: homeAway?.home.games ?? 0,
    teams,
    favDogSeason: sumFavDog(favDogByWeek),
    favDogByWeek,
    homeAway
  };
}

/**
 * Every team's situational ATS quadrants for one season, powering the pick-card nugget
 * (issue #406 PR 2). Reads league_ats_situational, which derives from the same
 * league_ats_base matview as the /league views above — no aggregation is duplicated. One
 * row per (team, home/away, favorite/underdog); the picks page indexes these client-side and
 * shows each game the single quadrant that matches it. Group-independent (service-role read,
 * ADR-0013). Pick'em games have no favorite/underdog quadrant and are excluded upstream.
 */
export async function getLeagueSituational(seasonYear: number): Promise<LeagueSituationalRecord[]> {
  const { data, error } = await supabaseService
    .from('league_ats_situational')
    .select('*')
    .eq('season_year', seasonYear);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    if (row.team_id == null || row.is_home == null || row.is_favorite == null) return [];
    return [
      {
        teamId: row.team_id,
        isHome: row.is_home,
        isFavorite: row.is_favorite,
        games: n(row.games),
        ats: rec(row.ats_wins, row.ats_losses, row.ats_pushes)
      }
    ];
  });
}

/**
 * The forward-looking slate for the upcoming scoring week (issue #429): the currently-active
 * week's not-yet-kicked-off games, each side annotated with the situational quadrant that
 * matches its current line (reusing the pick-card nugget logic). Deep-links to `/picks` rely
 * on these being the same pickable games the picks board renders, so we read the same active
 * week + active lines the picks page does.
 *
 * Returns the empty slate (`weekNumber: null`, no games) in the offseason (no active week), a
 * non-scoring week, or a bye / between-weeks gap where every game has already kicked off — the
 * component's empty state. Unlike the graded /league modules this is week- and line-sensitive,
 * so its cache is keyed and revalidated separately (ADR-0017); this function just composes it.
 *
 * `seasonYear` scopes the situational lookup and should be the current season (the season the
 * upcoming week belongs to); the caller resolves it via `getCurrentSeasonYear()`.
 */
export async function getLeagueSlate(seasonYear: number): Promise<LeagueSlate> {
  const week = await findActiveWeek();
  // Offseason (no active week) or a non-scoring exhibition week → empty slate.
  if (!week || week.is_scoring === false) {
    return { seasonYear, weekNumber: null, games: [] };
  }

  const [games, situational] = await Promise.all([
    getGamesWithActiveLines(week.id),
    getLeagueSituational(seasonYear)
  ]);

  const slateGames = buildSlateGames(games, situational, Date.now());
  // A bye / mid-week gap (every game already kicked off) collapses to the empty state.
  if (slateGames.length === 0) return { seasonYear, weekNumber: null, games: [] };

  return { seasonYear, weekNumber: week.week_number, games: slateGames };
}
