- **PR #589** Add ADR-0031 (Proposed) — local JWT verification on the auth hot path:
  record the decision to replace the per-navigation `getUser()` auth-server round-trip
  (the top request-path cost in Sentry) with local `getClaims()` JWKS verification, to cut
  PWA tab-switch latency. Decision doc only; implementation tracked in #588. governing
  ADR-0031. file: `docs/adr/0031-local-jwt-verification-hot-path.md`
