- **#838** A `/week` scorecard now answers its own question. The header splits into identity
  (matchup + line) and result (score + verdict): the score leads at 24px instead of sitting in
  the title row at body weight, and a new cover readout names which side beat the number and by
  how much — live and present-tense during the game, settled once it ends, `Push` on the number.
  It is framed by the side that covered and coloured `--success` (amber on a push), never red,
  so it always agrees with the win/loss tint on the team rows beneath it; framing it by the
  favourite would have put a red verdict over a green underdog row. Computed from the game's
  line through the same `ats_margin_at_lock` mirror grading uses — never a member's frozen
  locked line — so no code path attaches it to a member's row. Also moves the card's two
  sub-`text-xs` sizes back onto the type ramp and trims the card padding for the grid. files:
  `src/lib/components/leaderboard/WeeklyPickCard.svelte` · `src/lib/domain/spread.ts` ·
  ADR-0007 · ADR-0029 · ADR-0030
