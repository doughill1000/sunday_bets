- **#694** The `/demo` CI drift-guard now checks editorial freshness, not just shape —
  it fails when the snapshot's completed season falls more than 2 years behind the
  live season, or when the snapshot is older than 180 days, closing the coverage gap
  ADR-0026 §6 / #669 flagged behind #607. files:
  `src/lib/server/demo/__tests__/demo-snapshot.test.ts`
