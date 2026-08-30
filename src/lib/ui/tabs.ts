// The app's one page-level Tabs "selected" treatment, shared by /league, /wrapped and both
// demo mirrors so the pattern can only ever be changed in one place (ADR-0029).
//
// #868: this used to be a solid `bg-primary` fill. At 390px a two-lane TabsList is half the
// screen wide, so the selected tab was the single largest gold field on /league — competing
// head-on with the honors identity, the demo "New here?" link and the gold nav item, all of
// which read at roughly the same weight. DESIGN.md P5 asks the four gold meanings
// (selected / actionable / primary / status) to stay visually distinct, so they are now
// separated by FORM rather than by a second colour: a solid brass fill stays reserved for
// *actionable / primary* (buttons, the demo sign-up CTA), while *selected* is a brass
// outline over a brass wash — the same "selected modifier/accent" tier the picks board
// already uses for a chosen weight (`.weight-btn[data-state='on']` in app.css).
//
// The label deliberately stays `--foreground` rather than gold ink: brass ink on a brass
// wash clears AA on charcoal but lands at ~4.3:1 on the Parchment `--muted` list ground, so
// a gold label here would fail the contrast floor (DESIGN.md P12) in the light theme. Ink is
// spent on the border (a non-text element at 4.5:1+ in both themes) and the wash carries the
// rest. The `dark:` half is not decoration — the vendored trigger ships its own
// `dark:data-[state=active]:*` overrides, which would otherwise win the cascade on charcoal.
export const ACTIVE_TAB_TRIGGER_CLASS =
  'data-[state=active]:border-primary-ink data-[state=active]:bg-primary/15 data-[state=active]:text-foreground dark:data-[state=active]:border-primary-ink dark:data-[state=active]:bg-primary/15 dark:data-[state=active]:text-foreground';
