---
name: ci-triage
description: Diagnose a red GitHub Actions check without burning context on full logs — fetch only the failing step's tail, check it against this repo's known CI patterns (stale-branch lint drift, path-filtered skips, governance-freshness doc gaps), and decide rerun vs. fix vs. not-actually-blocking. Use when a PR check is failing and you need to know why before deciding what to do next.
---

# Triage a red CI check

Token-disciplined diagnosis for a failing check. The naive move — `gh run view --log`
— dumps a whole job's log (often thousands of lines of setup/teardown) into context;
this fetches only what failed. Canonical CI structure: `docs/agent-context/testing.md`.

## Steps

1. **Find the failing run.**

   ```powershell
   gh pr checks <NNN> --repo doughill1000/sunday_bets
   ```

   Note the failing check's name and the run it links to.

2. **Fetch only the failing step, not the whole log.**

   ```powershell
   gh run view <RUN_ID> --repo doughill1000/sunday_bets --log-failed
   ```

   Only fall back to a full job log (`gh run view <RUN_ID> --log --job <JOB_ID>`,
   scoped to the one job) if `--log-failed` truncated something you actually need.

3. **Check it against known patterns before assuming it's a new bug:**

   | Symptom                                                                        | Real cause                                                                                                              | What to do                                                                                        |
   | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
   | `lint` fails on lines you didn't touch                                         | `master` moved since the branch was cut (a parallel PR shifted formatting)                                              | Merge/rebase `origin/master`, run `pnpm format`, re-push — don't assume your own diff is at fault |
   | `unit`/`build`/`smoke` show **skipped**, not failed, on a docs-only PR         | Expected — `ci-tests.yml`'s `detect-changes`/`playwright.yml` path-filter skips these for docs-only changes             | Not a failure; don't rerun expecting them to execute                                              |
   | `pgTap`/`integration` show **skipped**                                         | Path filter didn't match (`supabase/**` etc. unchanged)                                                                 | Expected — same skip-tolerant `*-result` gate pattern                                             |
   | `governance` (Governance freshness) fails                                      | Not a flake — an ADR is still `Proposed` with its issue closed, or a merged PR is missing its `docs/CHANGELOG.md` entry | Fix the doc (flip ADR Status, add the changelog entry) — don't rerun                              |
   | pgTAP/integration fails **in CI** with a count-assertion or FK-collision error | **Not** the local-only seeded/demo-DB flake (`005_cron_run_log`, `grading.test.ts`) — CI always runs against a clean DB | Investigate as a real regression; don't dismiss it by pattern-matching to the local-only gotcha   |
   | `verify` (migration drift) fails                                               | The generated migration doesn't reproduce `supabase/src`                                                                | Regenerate via `pnpm db:migration`; never hand-edit the migration file                            |

4. **Decide and act:**
   - **Stale branch** → refresh from `origin/master` first, don't just rerun.
   - **Real failure** → fix the code/test/doc, push; the check reruns automatically.
   - **Genuinely transient** (rare — a flaky external fetch) → `gh run rerun <RUN_ID>
--repo doughill1000/sunday_bets --failed`.
   - **Unclear from the failed-step log alone** → pull the full log for that one job
     before guessing further.

## Remember

- **`--log-failed` first, always.** A full log on a 20-minute pgTAP/integration run is
  mostly noise.
- **Skipped ≠ failed.** The `*-result` wrapper jobs (`unit-result`, `build-result`,
  `smoke-result`, `pgTap-result`, `verify-result`) pass on either a real pass or an
  upstream path-filter skip — see `docs/agent-context/testing.md`.
- **Local-only flakes are not CI flakes.** Don't import a "known issue" from local dev
  (seeded-DB count assertions, demo-seed FK collisions) into a CI triage — CI's DB is
  always clean, so a failure of that shape there is real.
- **Not every red check blocks merge.** The Master ruleset's required contexts are
  `unit-result`, `build-result`, `smoke-result`, `pgTap-result`, `dry-run-result`,
  `verify-result`. `lint`, `integration`, `full` (playwright), and `governance` run and
  report on every PR but are **not** ruleset-required today — red doesn't mechanically
  block a merge Doug chooses to make, though it should still generally be fixed rather
  than waved through. Re-check `gh api repos/doughill1000/sunday_bets/rulesets/<id>` if
  this matters and the ruleset may have changed.
- If genuinely stuck after checking the patterns above, say so rather than repeatedly
  rerunning the same red check.

## See also

- `docs/agent-context/testing.md` (CI gating structure, the four test layers)
- `scripts/check-governance-freshness.ts` (what the `governance` job actually checks)
- Sibling skills: `land-pr` (calls this when a check is red), `test-gate` (run these
  same layers locally first so this is rarely needed)
