- **#693** Drop the per-user points-threshold knob from line-move alerts — the on/off
  toggle stays, but `detectLineShifts` now compares against a single fixed constant
  (`LINE_SHIFT_THRESHOLD_POINTS = 2`) instead of a per-user preference. Per the
  2026-07-16 product audit's smaller of two options (drop the knob vs. retire the
  alert). files: `src/lib/server/notifications.ts` · `src/routes/(app)/settings`
