// Server-only loader for the committed demo-season snapshot (#460, ADR-0026).
//
// The fixture is a generated build artifact: `pnpm demo:snapshot` re-derives it through the
// real grading → awards → Wrapped → recap pipeline and writes `demo-snapshot.json` here. The
// public `/demo` routes read only this fixture — no live DB reads, no LLM calls at serve time.
// Kept under `$lib/server` so the (potentially large) JSON is never bundled into client JS;
// each demo `+page.server.ts` selects the slice its page needs.
import demoSnapshotJson from './demo-snapshot.json';
import type { DemoSnapshot } from '$lib/types/demo';

// The JSON is generated to satisfy the DemoSnapshot contract; the CI drift-guard test renders
// every demo surface against it and fails if a field is missing, so the cast is enforced.
const DEMO_SNAPSHOT = demoSnapshotJson as unknown as DemoSnapshot;

/** The full committed demo snapshot. */
export function getDemoSnapshot(): DemoSnapshot {
  return DEMO_SNAPSHOT;
}
