# ADR-0024: Missed-pick penalty is a league-membership rule; imported seasons are frozen from grading

- Status: Proposed
- Date: 2026-07-08
- Issue: #447
- Supersedes: None

## Context

Two grading-integrity defects surfaced while investigating a drifted 2022 champion in
production.

1. **The missed-pick penalty exempted the app admin.** The penalty pass in
   `_grade_games_by_ids` selected the penalizable population by the global `users.role`
   column (`role = 'player'`), which exists to gate app-admin access (`is_admin()` guards
   RLS on `settings` / `audit_log` / `cron_run_log`). The single app admin (Doug) is also a
   full competitor, so he was silently never charged the −1 for a game he skipped, in every
   season. This is invisible in normal live play (small effect) but became decisive when the
   #430 finals backfill re-graded 2022–2024: every real player took missed penalties and the
   admin did not, **flipping the 2022 season winner** to the admin.

2. **Nothing stopped grading from re-touching imported seasons.** The 2022–2024 seasons were
   imported once, straight from the historical Google-Sheets point columns (issue #94), with
   **no** missed-pick penalties — the import deliberately bypassed `grade_*`. But any later
   grade run (an ad-hoc `grade_season`, the grade cron, or the planned #433 reconcile sweep)
   re-derives settlements from `final_scores` and re-applies today's rules, which diverges
   from the sheet on two axes: it injects the 2025-era missed penalty, and it recomputes real
   picks from backfilled finals rather than the recorded sheet points. The one-time data
   restore that fixed 2022 is therefore re-openable by any future grade.

The missed-pick penalty (`settings.missed_pick_penalty`, default −1) is an existing scoring
primitive with no dedicated ADR; drop-worst-week (ADR-0005 / ADR-0018) and the grading preset
(ADR-0007) are the neighbouring scoring decisions. Live grading began with the 2025 season.

## Decision

**A. The missed-pick penalty is scoped to active league membership, not app role.** The
penalty pass in `_grade_games_by_ids` selects every `group_memberships` row with
`status = 'active'` that has no pick for the game, regardless of the member's global
`users.role`. App-admin members are penalized exactly like any other competitor. The change
is confined to grading; `users.role` and everything it gates (`is_admin()`, admin-only RLS)
are untouched — administrative access and competitive standing are now cleanly separated.

**B. Imported seasons are frozen from grading via `seasons.grading_locked`.** A boolean
`grading_locked` (default `false`) is added to `seasons`, backfilled `true` for every
pre-2025 (imported) season. `_grade_games_by_ids` — the single choke point that
`grade_game` / `grade_week` / `grade_season`, the grade cron, and any future reconcile sweep
all funnel through — strips locked-season games before doing any work, so grading a locked
season is a no-op. A locked season's settlements can only ever come from the historical
import, preserving byte-for-byte parity with the sheet oracle. New (live) seasons default
unlocked.

## Consequences

- The admin now accrues missed penalties in live seasons (2025 onward): a one-time, scoped
  re-grade of 2025 is required at rollout (impact is a single −1 for the admin — no rank
  change). Pre-2025 seasons are excluded from that re-grade by decision B.
- Standings are now fair by construction: no participant is exempt from a penalty every other
  participant pays.
- `grading_locked` is a durable, cross-cutting constraint every present and future grade path
  must honour. It also bounds #433: the reconcile sweep's "finals present but unsettled"
  predicate must exclude locked seasons, or it would try to re-settle frozen history.
- Freezing is reversible (unlock a season and re-grade) if a genuine historical correction is
  ever needed — but that is now a deliberate act, not an accidental side effect of a cron.
- A golden-value regression test pins the imported 2022–2024 season totals to the sheet
  oracle so any future change that lets grading reach those seasons fails CI.

## Alternatives considered

- **Demote the admin to `users.role = 'player'`.** Rejected: `role = 'admin'` grants app-admin
  access via `is_admin()`; demoting would strip that. The conflation of "app admin" with
  "non-competitor" is the bug — the fix is to stop grading from reading app role.
- **Effective-date the missed penalty to 2025** (mirroring ADR-0018's start-year), leaving
  seasons otherwise gradable. Rejected as incomplete: it stops the penalty anachronism but not
  the real-pick recompute-from-backfilled-finals drift, so a re-grade could still diverge from
  the sheet. Freezing the whole season is the complete guard.
- **A hard-coded "first live season" year cutoff in each grade path.** Rejected: implicit and
  duplicated across call sites; an explicit per-season flag is self-documenting, enforced at
  one choke point, and lets a future season be frozen deliberately once concluded.

## Follow-up

- #447 — this change (membership-scoped penalty + `grading_locked` + pgTAP + the scoped 2025
  re-grade).
- #433 — the reconcile sweep must honour `grading_locked` in its unsettled-week predicate;
  land #447 first.
