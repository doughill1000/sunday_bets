- **PR #594** Add ADR-0033 (Proposed) — client-query data loading: record the decision
  behind #381 to classify every page load as a client TanStack Query against a `+server.ts`
  endpoint or a server-only concern, generalizing ADR-0017's validated-param pattern app-wide
  so a future Capacitor/native client gets a clean API. Decision doc only; implementation
  tracked in #381. governing ADR-0033. file: `docs/adr/0033-client-query-data-loading.md`
