// src/lib/server/espnApiResponses.ts
import { supabaseService } from '$lib/supabase/service';
import type { Json } from '$lib/types/supabase';

// Raw ESPN scoreboard payload retention (issue #450, ADR-0025). Mirrors the Odds API
// capture (issue #382, src/lib/server/oddsApiResponses.ts) so a disputed final is
// auditable to its source bytes. Unlike the Odds API, the ESPN scoreboard is a public
// endpoint with no API key in its query params, so there is no key to sanitize.
// Append-only; admin-only reads via RLS; writes are service-role only.
export async function recordEspnApiResponse(entry: {
  endpoint: string;
  requestParams: Record<string, string>;
  httpStatus: number;
  body: unknown;
}): Promise<void> {
  const { error } = await supabaseService.from('espn_api_responses').insert({
    endpoint: entry.endpoint,
    request_params: entry.requestParams,
    http_status: entry.httpStatus,
    body: entry.body as Json
  });
  if (error) throw error;
}
