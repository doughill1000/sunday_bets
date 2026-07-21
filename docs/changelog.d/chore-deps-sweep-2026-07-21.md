- **PR #754** Consolidate two open dependabot PRs (#743 dev-dependencies group,
  #680 `actions/setup-node`) onto one branch. Applied 17 of 18 dev-dependency bumps —
  `typescript` stays pinned at `^6.0.3` (TS 7's package shape still crashes
  `svelte-check`, per the standing hold from PR #511) — and bumped `actions/setup-node`
  to v7 across all 8 workflow files. Re-ran `pnpm format` to absorb a prettier/
  prettier-plugin-tailwindcss reformat of 32 files that was blocking `#743`'s `lint`
  check. files: `package.json` · `pnpm-lock.yaml` · `.github/workflows/*.yml`
