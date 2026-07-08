// Pure pooling helpers for the /league "Last 5 seasons" trends scope (epic #424).
//
// The single-season /league views (league_ats_spread_buckets, _quadrants, _primetime,
// _divisional, _home_away) each group by season_year. To show a pooled multi-season cut we
// read the per-season rows for the recent seasons and *sum the already-computed integer
// counts* here — the same roll-up shape as `sumFavDog()` in league.ts. This never recomputes
// cover math: league_ats_base remains the single source of truth for every win/loss/push, and
// cover % is still derived in the UI via the shared `coverPct` helper. Kept pure and out of
// the query layer so the summation is unit-testable without a database.
import type {
  AtsRecord,
  LeagueDivisionalSplit,
  LeagueFavDogSplit,
  LeagueHomeAway,
  LeaguePrimetimeSlot,
  LeagueQuadrant,
  LeagueSpreadBucket,
  PrimetimeSlot
} from '$lib/types/server/league';
import { PRIMETIME_SLOT_ORDER } from '$lib/utils/leagueAts';

const ZERO: AtsRecord = { wins: 0, losses: 0, pushes: 0 };

function addRecords(a: AtsRecord, b: AtsRecord): AtsRecord {
  return { wins: a.wins + b.wins, losses: a.losses + b.losses, pushes: a.pushes + b.pushes };
}

/** Sum favorite-cover counts by spread-size bucket across seasons; ordered pick'em-first. */
export function poolSpreadBuckets(rows: LeagueSpreadBucket[]): LeagueSpreadBucket[] {
  const byOrder = new Map<number, LeagueSpreadBucket>();
  for (const r of rows) {
    const acc = byOrder.get(r.bucketOrder);
    if (acc) {
      acc.games += r.games;
      acc.favoriteCovers += r.favoriteCovers;
      acc.underdogCovers += r.underdogCovers;
      acc.pushes += r.pushes;
    } else {
      byOrder.set(r.bucketOrder, { ...r });
    }
  }
  return [...byOrder.values()].sort((a, b) => a.bucketOrder - b.bucketOrder);
}

/** Sum the four home/away × favorite/underdog quadrants across seasons. */
export function poolQuadrants(rows: LeagueQuadrant[]): LeagueQuadrant[] {
  const key = (q: Pick<LeagueQuadrant, 'isHome' | 'isFavorite'>) => `${q.isHome}-${q.isFavorite}`;
  const map = new Map<string, LeagueQuadrant>();
  for (const r of rows) {
    const acc = map.get(key(r));
    if (acc) {
      acc.games += r.games;
      acc.ats = addRecords(acc.ats, r.ats);
    } else {
      map.set(key(r), {
        isHome: r.isHome,
        isFavorite: r.isFavorite,
        games: r.games,
        ats: { ...r.ats }
      });
    }
  }
  return [...map.values()];
}

/** Sum favorite-cover counts by kickoff slot across seasons; canonical TNF→SNF→MNF→day order. */
export function poolPrimetime(rows: LeaguePrimetimeSlot[]): LeaguePrimetimeSlot[] {
  const map = new Map<PrimetimeSlot, LeaguePrimetimeSlot>();
  for (const r of rows) {
    const acc = map.get(r.slot);
    if (acc) {
      acc.games += r.games;
      acc.favoriteCovers += r.favoriteCovers;
      acc.underdogCovers += r.underdogCovers;
      acc.pushes += r.pushes;
    } else {
      map.set(r.slot, { ...r });
    }
  }
  return [...map.values()].sort(
    (a, b) => PRIMETIME_SLOT_ORDER.indexOf(a.slot) - PRIMETIME_SLOT_ORDER.indexOf(b.slot)
  );
}

/** Sum favorite-cover counts for divisional vs non-divisional matchups across seasons. */
export function poolDivisional(rows: LeagueDivisionalSplit[]): LeagueDivisionalSplit[] {
  const map = new Map<boolean, LeagueDivisionalSplit>();
  for (const r of rows) {
    const acc = map.get(r.isDivisional);
    if (acc) {
      acc.games += r.games;
      acc.favoriteCovers += r.favoriteCovers;
      acc.underdogCovers += r.underdogCovers;
      acc.pushes += r.pushes;
    } else {
      map.set(r.isDivisional, { ...r });
    }
  }
  return [...map.values()];
}

/** Sum the home/away ATS + SU records across seasons; null when no seasons contributed. */
export function poolHomeAway(rows: LeagueHomeAway[]): LeagueHomeAway | null {
  if (rows.length === 0) return null;
  return rows.reduce<LeagueHomeAway>(
    (acc, r) => ({
      home: {
        games: acc.home.games + r.home.games,
        ats: addRecords(acc.home.ats, r.home.ats),
        su: addRecords(acc.home.su, r.home.su)
      },
      away: {
        games: acc.away.games + r.away.games,
        ats: addRecords(acc.away.ats, r.away.ats),
        su: addRecords(acc.away.su, r.away.su)
      }
    }),
    {
      home: { games: 0, ats: ZERO, su: ZERO },
      away: { games: 0, ats: ZERO, su: ZERO }
    }
  );
}

/**
 * The pooled favorite/underdog headline, derived from the pooled quadrants rather than a
 * separate query. Each non-pick'em game has exactly one favorite whose side lands in a
 * favorite quadrant (home or road), so summing the two favorite quadrants gives the league
 * favorite's ATS wins (favorite covered) / losses (underdog covered) / pushes — the same
 * counts the per-season league_ats_fav_dog view produces. `games` is their total (= the
 * non-pick'em game count). `weekNumber` is null: a pooled week number is meaningless.
 */
export function deriveFavDogHeadline(quadrants: LeagueQuadrant[]): LeagueFavDogSplit {
  const fav = quadrants.filter((q) => q.isFavorite);
  const favoriteCovers = fav.reduce((s, q) => s + q.ats.wins, 0);
  const underdogCovers = fav.reduce((s, q) => s + q.ats.losses, 0);
  const pushes = fav.reduce((s, q) => s + q.ats.pushes, 0);
  return {
    weekNumber: null,
    games: favoriteCovers + underdogCovers + pushes,
    favoriteCovers,
    underdogCovers,
    pushes
  };
}
