import { supabaseService } from '$lib/supabase/service';
import type { Tables } from '$lib/types/supabase';
import type {
  AtsRecord,
  LeagueAts,
  LeagueDivisionalSplit,
  LeagueFavDogSplit,
  LeagueHomeAway,
  LeaguePrimetimeSlot,
  LeagueQuadrant,
  LeagueSituationalRecord,
  LeagueSpreadBucket,
  LeagueTeamAts,
  PrimetimeSlot
} from '$lib/types/server/league';
import { PRIMETIME_SLOT_ORDER } from '$lib/utils/leagueAts';

type TeamRow = Tables<'league_ats_team'>;
type FavDogRow = Tables<'league_ats_fav_dog'>;
type HomeAwayRow = Tables<'league_ats_home_away'>;
type SpreadBucketRow = Tables<'league_ats_spread_buckets'>;
type QuadrantRow = Tables<'league_ats_quadrants'>;
type PrimetimeRow = Tables<'league_ats_primetime'>;
type DivisionalRow = Tables<'league_ats_divisional'>;

const PRIMETIME_SLOTS = new Set<string>(PRIMETIME_SLOT_ORDER);
const isPrimetimeSlot = (slot: string | null): slot is PrimetimeSlot =>
  slot != null && PRIMETIME_SLOTS.has(slot);

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

function toSpreadBucket(row: SpreadBucketRow): LeagueSpreadBucket | null {
  // bucket_order / bucket are non-null in practice (grouped keys); guard the nullable types.
  if (row.bucket_order == null || row.bucket == null) return null;
  return {
    bucketOrder: row.bucket_order,
    bucket: row.bucket,
    games: n(row.games),
    favoriteCovers: n(row.favorite_covers),
    underdogCovers: n(row.underdog_covers),
    pushes: n(row.pushes)
  };
}

function toQuadrant(row: QuadrantRow): LeagueQuadrant | null {
  // The view filters is_favorite is not null and groups by both flags; guard the types.
  if (row.is_home == null || row.is_favorite == null) return null;
  return {
    isHome: row.is_home,
    isFavorite: row.is_favorite,
    games: n(row.games),
    ats: rec(row.ats_wins, row.ats_losses, row.ats_pushes)
  };
}

function toPrimetimeSlot(row: PrimetimeRow): LeaguePrimetimeSlot | null {
  // A row whose slot isn't one of the four known windows is skipped rather than mislabeled;
  // the view only ever emits these four, so this is a type guard, not a real filter.
  if (!isPrimetimeSlot(row.slot)) return null;
  return {
    slot: row.slot,
    games: n(row.games),
    favoriteCovers: n(row.favorite_covers),
    underdogCovers: n(row.underdog_covers),
    pushes: n(row.pushes)
  };
}

/** Sort primetime rows into the canonical TNF → SNF → MNF → day display order. */
function sortPrimetime(slots: LeaguePrimetimeSlot[]): LeaguePrimetimeSlot[] {
  const order = (slot: PrimetimeSlot) => PRIMETIME_SLOT_ORDER.indexOf(slot);
  return slots.toSorted((a, b) => order(a.slot) - order(b.slot));
}

function toDivisionalSplit(row: DivisionalRow): LeagueDivisionalSplit | null {
  // is_divisional is the grouping key; a null (unclassifiable) row shouldn't reach here
  // because the view excludes games with no division, but guard the nullable type.
  if (row.is_divisional == null) return null;
  return {
    isDivisional: row.is_divisional,
    games: n(row.games),
    favoriteCovers: n(row.favorite_covers),
    underdogCovers: n(row.underdog_covers),
    pushes: n(row.pushes)
  };
}

/**
 * Favorite ATS cover rate by spread-size bucket for one season (issue #426, wave B). Reads
 * league_ats_spread_buckets, a plain view over the shared league_ats_base matview — no cover
 * math is duplicated. One row per bucket; ordered pick'em first, then ascending line size.
 * Group-independent (service-role read, ADR-0013).
 */
export async function getLeagueSpreadBuckets(seasonYear: number): Promise<LeagueSpreadBucket[]> {
  const { data, error } = await supabaseService
    .from('league_ats_spread_buckets')
    .select('*')
    .eq('season_year', seasonYear)
    .order('bucket_order');
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const bucket = toSpreadBucket(row);
    return bucket ? [bucket] : [];
  });
}

/**
 * The four league-wide home/away × favorite/underdog cover rates for one season (issue #426,
 * wave B). Reads league_ats_quadrants, a plain view over the same league_ats_base matview as
 * the per-team league_ats_situational — no cover math is duplicated. Pick'em games are
 * excluded upstream. Group-independent (service-role read, ADR-0013).
 */
export async function getLeagueQuadrants(seasonYear: number): Promise<LeagueQuadrant[]> {
  const { data, error } = await supabaseService
    .from('league_ats_quadrants')
    .select('*')
    .eq('season_year', seasonYear);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const quadrant = toQuadrant(row);
    return quadrant ? [quadrant] : [];
  });
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
 * League-wide team ATS for one season, assembled as the single cached /league payload
 * (ADR-0017): the per-team table, the favorite/underdog module (season aggregate + per-week
 * breakdown), the home/away module, the wave-B market cuts (spread-size buckets + league-wide
 * quadrants, issue #426), and the primetime and divisional situational modules (#427). Every
 * part reads the league_ats_* views, which derive from the single league_ats_base matview —
 * no aggregation is duplicated. Group-independent: identical for every user (ADR-0013
 * service-role read).
 */
export async function getLeagueAts(seasonYear: number): Promise<LeagueAts> {
  const [
    teamResult,
    favDogResult,
    homeAwayResult,
    primetimeResult,
    divisionalResult,
    spreadBuckets,
    quadrants
  ] = await Promise.all([
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
    supabaseService.from('league_ats_primetime').select('*').eq('season_year', seasonYear),
    supabaseService.from('league_ats_divisional').select('*').eq('season_year', seasonYear),
    getLeagueSpreadBuckets(seasonYear),
    getLeagueQuadrants(seasonYear)
  ]);

  if (teamResult.error) throw teamResult.error;
  if (favDogResult.error) throw favDogResult.error;
  if (homeAwayResult.error) throw homeAwayResult.error;
  if (primetimeResult.error) throw primetimeResult.error;
  if (divisionalResult.error) throw divisionalResult.error;

  const teams = (teamResult.data ?? []).flatMap((row) => {
    const entry = toTeam(row);
    return entry ? [entry] : [];
  });
  const favDogByWeek = (favDogResult.data ?? []).map(toFavDogWeek);
  const homeAway = homeAwayResult.data ? toHomeAway(homeAwayResult.data) : null;
  const primetime = sortPrimetime(
    (primetimeResult.data ?? []).flatMap((row) => {
      const slot = toPrimetimeSlot(row);
      return slot ? [slot] : [];
    })
  );
  const divisional = (divisionalResult.data ?? []).flatMap((row) => {
    const split = toDivisionalSplit(row);
    return split ? [split] : [];
  });

  return {
    seasonYear,
    // Qualifying scored games = the home-perspective count (one home row per game).
    totalGames: homeAway?.home.games ?? 0,
    teams,
    favDogSeason: sumFavDog(favDogByWeek),
    favDogByWeek,
    homeAway,
    spreadBuckets,
    quadrants,
    primetime,
    divisional
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
