import { vi } from 'vitest';

// Force the "no AI gateway configured" condition for the whole integration suite.
//
// The recap/badge/wrapped orchestrators serve deterministic fallback copy when no
// gateway is configured (voice.ts reads env.AI_GATEWAY_URL / env.AI_GATEWAY_TOKEN
// from $env/dynamic/private). The fallback-path suites (badgeFlavor, seasonWrapped)
// assert `generated === 0` on that basis.
//
// A developer's local .env.local commonly DOES carry AI_GATEWAY_URL/AI_GATEWAY_TOKEN
// (they're needed to refresh the demo snapshot with real LLM prose — ADR-0026/#460).
// Those vars flow into the code through SvelteKit's $env/dynamic/private virtual
// module (loaded by the sveltekit() vite plugin from .env.local), NOT through
// process.env — so a plain process.env clear does not remove them. Left untouched,
// the orchestrators make real gpt-5.4 calls: the fallback assertions fail AND every
// local `pnpm test:integration` run silently burns AI Gateway credit. CI has no
// creds, so it only ever bites locally.
//
// Strip just the two gateway keys (keeping the real Supabase/etc. env the DB
// integration suites depend on) so the suite is hermetic and free regardless of the
// developer's env. The real-LLM path is exercised by the demo-snapshot refresh, not
// by this DB-integration suite.
vi.mock('$env/dynamic/private', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$env/dynamic/private')>();
  // Type the copy with optional values so `delete` is permitted under strict TS (TS2790).
  const env: Record<string, string | undefined> = { ...mod.env };
  delete env.AI_GATEWAY_URL;
  delete env.AI_GATEWAY_TOKEN;
  return { env };
});
