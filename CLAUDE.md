# CLAUDE.md

Read and follow `AGENTS.md`. It is the shared instruction source for Claude, Codex,
and other coding agents in this repository.

For planned work, also read `docs/WORKFLOW.md`, the assigned GitHub Issue, and every
linked or governing ADR before editing. Do not maintain a separate copy of repository
rules here; that would allow the two agent workflows to drift.

The natural-language issue-creation triggers and draft-before-write approval gate in
`AGENTS.md` apply to Claude unchanged.

When creating a new worktree, copy the gitignored `.env*` files from the main
checkout into it (a fresh worktree has none and cannot reach Supabase / The Odds
API without them). Use `scripts/new-worktree.ps1`, which creates the worktree,
copies the env files, installs deps, and can launch dev on a non-default port. To
run a worktree's dev server without switching repos:
`pnpm -C ..\<worktree> run dev -- --port 5174`. See `AGENTS.md` ("Delivery
workflow") and `docs/WORKFLOW.md` ("Claim and isolate work") for the full rule.
