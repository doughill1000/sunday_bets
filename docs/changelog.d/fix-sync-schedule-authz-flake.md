- **PR #617** De-flake the admin authz integration suite — the
  `/api/admin/sync-schedule` auth test no longer runs the real `syncSchedule()` (up to
  ~22 live ESPN fetches that intermittently tripped vitest's 5s timeout in CI); it now
  mocks `$lib/server/scheduleSync` to assert only the admin boundary. Test-only. file:
  tests/integration/adminAuthz.test.ts
