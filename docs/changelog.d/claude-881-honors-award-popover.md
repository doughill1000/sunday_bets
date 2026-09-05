- **#881** Season award chips on `/league` Honors explain themselves where you tap them. The
  chip used to carry `title={badge.flavor}` — a desktop hover tooltip that never fires on a
  phone, so the chip invited a tap it could not answer and the only way to decode the one in
  front of you was to open the Awards legend and scroll the whole catalog. Each chip is now a
  real 44px button that opens a popover pinned to it, leading with the award's flavor line and
  then how it is earned — reusing copy already on the award, no engine or query change. The
  Awards legend keeps the whole shelf and is untouched; the popover never opens from inside it
  (DESIGN.md P3, one level of disclosure). Weekly hardware tiles are deliberately unchanged —
  each already shows its holder and stat on the tile face. Adds a shared `ui/popover` primitive
  beside the existing `ui/dialog` and `ui/sheet`. `LeagueHonors.svelte` ·
  `src/lib/components/ui/popover/` · `/demo` inherits it via the shared component (ADR-0026;
  design per ADR-0030 / ADR-0029).
