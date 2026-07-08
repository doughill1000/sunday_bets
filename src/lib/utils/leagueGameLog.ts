// Pure helpers for rendering a team's ATS game log in the /league drill-down (issue #428).
// Both inputs are already team-relative (from league_ats_base): spread_value < 0 = favored,
// margin > 0 = covered. Kept out of the component so the sign/pick'em rules are unit-tested.

/** Format a value with an explicit leading sign, rounded to at most one decimal (e.g. -3,
 *  +6.5). Half-point lines/margins are common; anything finer is a data artifact. */
function signed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded < 0 ? '-' : '+'}${Math.abs(rounded)}`;
}

/**
 * Team-relative closing line for display: a negative spread (favored) reads e.g. "-3.5", a
 * positive spread (underdog) "+6", and a pick'em (0) reads "PK".
 */
export function formatLine(spreadValue: number): string {
  if (spreadValue === 0) return 'PK';
  return signed(spreadValue);
}

/**
 * Team-relative cover margin for display: "+7" covered by seven, "-3" missed by three, and a
 * push (0) reads "Push" — it is a no-decision against the spread, not a zero-point cover.
 */
export function formatCoverMargin(margin: number): string {
  if (margin === 0) return 'Push';
  return signed(margin);
}
