- **#697** Config-gate the header Beta tag — a build-time flag (`SHOW_BETA_TAG`,
  defaulting to shown) now controls the feedback-sheet Beta tag instead of it being
  implicitly tied to sign-in state, so it can flip off in one change at the public
  epoch. ADR-0028 follow-up. files: `vite.config.ts` · `src/app.d.ts` ·
  `src/lib/components/app-header/AppHeader.svelte` · `.env.example`
