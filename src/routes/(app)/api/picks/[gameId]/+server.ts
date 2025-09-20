// src/routes/api/picks/[gameId]/+server.ts
import type { TeamSide, WeightCode } from '$lib/types/domain';
import type { RequestHandler } from './$types';
import { error as httpError, json } from '@sveltejs/kit';

// Keep the payload shape your frontend sends
type Body = {
  team?: TeamSide;
  weight?: WeightCode;
};

// POST /api/picks/:gameId  -> lock_pick
export const POST: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;
  const body = (await event.request.json()) as Body;

  if (!body.team || !body.weight) {
    return json({ ok: false, reason: 'missing team/weight' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('lock_pick', {
    p_game_id: gameId,
    p_side: body.team,
    p_weight: body.weight
    // p_source: 'fanduel', // uncomment if your SQL added this param
  });

  if (error) {
    // Normalize common DB errors to user-friendly reasons
    const msg = error.message ?? '';
    if (/no active line/i.test(msg)) {
      return json(
        { ok: false, reason: 'Line unavailable for this game. Try again shortly.' },
        { status: 409 }
      );
    }
    if (/edits are not allowed after kickoff/i.test(msg)) {
      return json({ ok: false, reason: 'Game already started.' }, { status: 409 });
    }
    if (/all in already used/i.test(msg)) {
      return json({ ok: false, reason: 'All-In already used this week.' }, { status: 409 });
    }
    throw httpError(500, msg);
  }

  // RPC returns SETOF; normalize to one row
  const row = Array.isArray(data) ? data[0] : data;
  return json({
    ok: true,
    final_locked_at: row?.locked_at ?? null
  });
};

// DELETE /api/picks/:gameId -> unlock_pick (assumes you have an RPC named unlock_pick)
export const DELETE: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;

  const { data, error } = await supabase.rpc('unlock_pick', { p_game_id: gameId });
  if (error) {
    const msg = error.message ?? '';
    if (/game started/i.test(msg) || /after kickoff/i.test(msg)) {
      return json({ ok: false, reason: 'Cannot unlock after kickoff.' }, { status: 409 });
    }
    throw httpError(500, msg);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return json({ ok: true, unlocked_at: row?.unlocked_at ?? null });
};
