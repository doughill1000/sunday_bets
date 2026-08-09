- **#789** Preseason no longer gets a weekly recap — a non-scoring round (ADR-0016) is
  pickable and graded but counts for nothing, and the matviews had always known that. The
  post-grade story surfaces did not: the AI recap and both recap pushes gated only on "every
  game is final", which a one-game preseason round satisfies the moment it ends. Prod duly
  wrote a recap for the 2026 preseason opener, narrating all-time head-to-head because the
  week itself had given it nothing to say. All three now sit behind the same scoring gate, so
  the story starts with the regular season. The completeness check that three post-grade
  modules had each been keeping their own copy of is now shared too. ADR-0016 amended. files:
  `isScoringWeek` (new) · `isWeekFullyGraded` (moved) · `aiRecap` · `notifications`
