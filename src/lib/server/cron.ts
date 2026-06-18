// src/lib/server/cron.ts
import { timingSafeEqual } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { CRON_SECRET } from '$env/static/private';
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import type { Json } from '$lib/types/supabase';

// ---------------------------------------------------------------------------
// requireCronSecret
// Mirrors requireAdmin — returns null on success, a 401 Response on failure.
// Uses constant-time comparison to prevent timing attacks.
// ---------------------------------------------------------------------------
export function requireCronSecret(event: RequestEvent): Response | null {
  const authHeader = event.request.headers.get('Authorization') ?? '';

  // Fail closed if the secret is unset/blank — otherwise `expected` collapses to
  // "Bearer " (or "Bearer undefined") and a matching header would authenticate.
  if (!CRON_SECRET || CRON_SECRET.trim().length === 0) {
    return new Response(JSON.stringify({ ok: false, reason: 'Unauthorized' }), { status: 401 });
  }

  const expected = `Bearer ${CRON_SECRET}`;

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(authHeader, 'utf8');

  // Length check is not secret-revealing (only token content is secret), so
  // checking it separately is safe.  We still always run timingSafeEqual to
  // avoid branching on content — pad actual to match expected length so the
  // call doesn't throw on mismatched buffer sizes.
  const lengthMatches = expectedBuf.length === actualBuf.length;
  // Pad both to maxLen so timingSafeEqual never throws on mismatched sizes.
  const maxLen = Math.max(expectedBuf.length, actualBuf.length);
  const paddedExpected = Buffer.concat([expectedBuf, Buffer.alloc(maxLen - expectedBuf.length)]);
  const paddedActual = Buffer.concat([actualBuf, Buffer.alloc(maxLen - actualBuf.length)]);

  const contentMatches = timingSafeEqual(paddedExpected, paddedActual);

  if (!lengthMatches || !contentMatches) {
    return new Response(JSON.stringify({ ok: false, reason: 'Unauthorized' }), { status: 401 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// withCronLog
// Wraps a cron job function with structured logging to cron_run_log.
// ---------------------------------------------------------------------------
export async function withCronLog<T>(
  job: string,
  fn: () => Promise<T>
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  // 1. Insert a start row and capture its id
  const { data: startRow, error: insertError } = await supabaseService
    .from('cron_run_log')
    .insert({ job, started_at: new Date().toISOString() })
    .select('id')
    .single();

  if (insertError) {
    // Capture insert failure but still run the job — Supabase downtime
    // shouldn't silently swallow cron work.
    Sentry.captureException(insertError);
  }

  const logId: number | null = startRow?.id ?? null;

  // Best-effort row update; failures here are non-fatal
  async function updateLog(patch: {
    finished_at: string;
    ok: boolean;
    summary?: Json;
    error?: string;
  }) {
    if (logId === null) return;
    await supabaseService.from('cron_run_log').update(patch).eq('id', logId);
  }

  // 2. Run the job
  try {
    const result = await fn();

    // 3. Success: update with ok=true and the result as jsonb summary
    await updateLog({
      finished_at: new Date().toISOString(),
      ok: true,
      summary: result as Json
    });

    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // 4. Failure: report to Sentry then update with ok=false
    Sentry.captureException(e);

    await updateLog({
      finished_at: new Date().toISOString(),
      ok: false,
      error: message
    });

    return { ok: false, error: message };
  }
}
