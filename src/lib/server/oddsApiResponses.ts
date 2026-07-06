// src/lib/server/oddsApiResponses.ts
import { supabaseService } from '$lib/supabase/service';
import type { Json } from '$lib/types/supabase';

// The Odds API key must never be persisted. `URLSearchParams` carries it
// alongside the other request params, so strip it before storage.
export function sanitizeParams(params: URLSearchParams): Record<string, string> {
  const sanitized = Object.fromEntries(params);
  delete sanitized.apiKey;
  return sanitized;
}

export async function recordOddsApiResponse(entry: {
  endpoint: string;
  requestParams: Record<string, string>;
  httpStatus: number;
  body: unknown;
}): Promise<void> {
  const { error } = await supabaseService.from('odds_api_responses').insert({
    endpoint: entry.endpoint,
    request_params: entry.requestParams,
    http_status: entry.httpStatus,
    body: entry.body as Json
  });
  if (error) throw error;
}
