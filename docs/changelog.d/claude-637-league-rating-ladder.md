- **#637** /league credibility ladder — the All-time Standings scope now shows every member's
  career rating and tier, so the room (who beat five friends) and the market (who beat the number)
  finally read on one screen. Replaces the market signal `#634` removed from /league, and rides the
  existing All-time cache entry. adr: ADR-0032 · routes: `/league` ·
  files: `src/lib/components/leaderboard/RatingLadder.svelte` · `src/lib/domain/rating.ts`
