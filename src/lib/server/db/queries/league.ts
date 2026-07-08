import { supabaseService } from '$lib/supabase/service';
import type { Tables } from '$lib/types/supabase';
import type {
  AtsRecord,
  LeagueAts,
  LeagueFavDogSplit,
  LeagueHomeAway,
  LeagueSituationalRecord,
  LeagueTeamAts,
  LeagueTeamGameLog,
  LeagueTeamGameLogEntry,
  LeagueTeamStreak
} from '$lib/types/server/league';

type TeamRow = Tables<'league_ats_team'>;
type FavDogRow = Tables<'league_ats_fav_dog'>;
type HomeAwayRow = Tables<'league_ats_home_away'>;
type StreakRow = Tables<'league_ats_streaks'>;
type BaseRow = Tables<'league_ats_base'>;

// ats_result / su_result / streak_result are typed `string | null`; narrow the view's known
// domain to the three literals the UI switches on (anything else — never emitted — is dropped).
type AtsOutcome = 'win' | 'loss' | 'push';
const asOutcome = (v: string | null): AtsOutcome | null =>
  v === 'win' || v === 'loss' || v === 'push' ? v : null;

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

function toStreak(row: StreakRow): LeagueTeamStreak | null {
  if (row.team_id == null || row.team_name == null || row.team_short_name == null) return null;
  const streakResult = asOutcome(row.streak_result);
  if (streakResult == null) return null;
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    teamShortName: row.team_short_name,
    streakResult,
    // A push resets the streak to 0 upstream, so coalesce guards only against a spurious null.
    streakLength: n(row.streak_length),
    last4: rec(row.last4_wins, row.last4_losses, row.last4_pushes)
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
  const [teamResult, favDogResult, homeAwayResult, streakResult] = await Promise.all([
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
      .maybeSingle(),
    supabaseService
      .from('league_ats_streaks')
      .select('*')
      .eq('season_year', seasonYear)
      .order('team_short_name')
  ]);

  if (teamResult.error) throw teamResult.error;
  if (favDogResult.error) throw favDogResult.error;
  if (homeAwayResult.error) throw homeAwayResult.error;
  if (streakResult.error) throw streakResult.error;

  const teams = (teamResult.data ?? []).flatMap((row) => {
    const entry = toTeam(row);
    return entry ? [entry] : [];
  });
  const favDogByWeek = (favDogResult.data ?? []).map(toFavDogWeek);
  const homeAway = homeAwayResult.data ? toHomeAway(homeAwayResult.data) : null;
  const streaks = (streakResult.data ?? []).flatMap((row) => {
    const entry = toStreak(row);
    return entry ? [entry] : [];
  });

  return {
    seasonYear,
    // Qualifying scored games = the home-perspective count (one home row per game).
    totalGames: homeAway?.home.games ?? 0,
    teams,
    favDogSeason: sumFavDog(favDogByWeek),
    favDogByWeek,
    homeAway,
    streaks
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

type BaseGameLogRow = Pick<
  BaseRow,
  'week_number' | 'opponent_team_id' | 'is_home' | 'spread_value' | 'margin' | 'ats_result'
>;

function toGameLogEntry(row: BaseGameLogRow): LeagueTeamGameLogEntry | null {
  const atsResult = asOutcome(row.ats_result);
  if (
    row.week_number == null ||
    row.opponent_team_id == null ||
    row.is_home == null ||
    row.spread_value == null ||
    row.margin == null ||
    atsResult == null
  ) {
    return null;
  }
  return {
    weekNumber: row.week_number,
    opponentTeamId: row.opponent_team_id,
    isHome: row.is_home,
    spreadValue: row.spread_value,
    margin: row.margin,
    atsResult
  };
}

/**
 * One team's full season ATS game log for the /league drill-down (issue #428). Reads the
 * per-perspective league_ats_base matview directly — no new view or aggregation — filtered to
 * this team and season and ordered by week (a team plays at most once per scoring week; game_id
 * breaks the rare tie deterministically). Each row is already team-relative (spread_value < 0 =
 * favored, margin > 0 = covered), so the UI renders it without re-deriving cover math.
 * Group-independent (service-role read, ADR-0013). Opponent names are resolved client-side from
 * the team list already loaded on /league, so no teams join is needed here.
 */
export async function getLeagueTeamGameLog(
  seasonYear: number,
  teamId: number
): Promise<LeagueTeamGameLog> {
  const { data, error } = await supabaseService
    .from('league_ats_base')
    .select('week_number, opponent_team_id, is_home, spread_value, margin, ats_result, game_id')
    .eq('season_year', seasonYear)
    .eq('team_id', teamId)
    .order('week_number')
    .order('game_id');
  if (error) throw error;
  const games = (data ?? []).flatMap((row) => {
    const entry = toGameLogEntry(row);
    return entry ? [entry] : [];
  });
  return { seasonYear, teamId, games };
}
