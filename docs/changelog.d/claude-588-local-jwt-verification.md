- **#588** Verify the session JWT locally on the auth hot path — the auth hook now
  cryptographically verifies each request's access token against the cached JWKS instead
  of a per-request round-trip to the auth server, cutting the largest controllable
  latency on every navigation. Fail-closed behavior, RLS authorization, and admin
  re-verification are unchanged; enabling asymmetric signing keys per environment is an
  operational rollout (see runbook). governing ADR-0031. files:
  `src/lib/server/auth-session.ts` · `src/hooks.server.ts` ·
  `docs/runbooks/auth-jwt-verification.md`
