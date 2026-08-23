- **#843** The Week tab's live dot means a game is on _right now_. It used to light up on
  kickoff and stay lit for the whole grade-reaching window the sweat board needs — so after a
  Thursday-night game it kept pulsing into Friday morning, hours after the game had ended and
  been settled, training everyone to ignore it. The dot now follows the live feed's own
  in-progress verdict, so it goes dark when the night's games are over and lights only while
  one is actually being played. The board's window and its stop-polling-when-final behaviour
  are untouched. A long-open app also re-checks the dot when it is resumed, rather than holding
  whatever value the last navigation happened to fetch. files:
  `src/lib/server/liveScores.ts` · `src/routes/(app)/api/week-live/+server.ts` ·
  `src/routes/+layout.svelte`
