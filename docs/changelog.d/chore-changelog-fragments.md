- **#586** Changelog entries move to per-PR fragments — each PR now drops a
  uniquely-named file under `docs/changelog.d/` instead of editing the top of
  `docs/CHANGELOG.md`, so concurrent same-day PRs never collide on GitHub (which ignores
  the `merge=union` fallback that only fixed local merges); `cut-release` assembles the
  fragments into the release block. files: `scripts/check-governance-freshness.ts` ·
  `docs/changelog.d/` · finish-pr / cut-release skills
