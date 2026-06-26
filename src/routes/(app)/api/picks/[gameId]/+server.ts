// src/routes/api/picks/[gameId]/+server.ts
import type { TeamSide, WeightCode } from '$lib/types/domain';
import type { RequestHandler } from './$types';
import { error as httpError, json } from '@sveltejs/kit';

type Body = {
  team?: TeamSide;
  weight?: WeightCode;
};

type FanOutRow = {
  group_id: string;
  ok: boolean;
  reason: string | null;
  locked_at?: string | null;
};

function normalizeFanOutError(msg: string): string {
  if (/no active line/i.test(msg)) return 'Line unavailable for this game. Try again shortly.';
  if (/edits are not allowed after kickoff/i.test(msg)) return 'Game already started.';
  if (/all in already used/i.test(msg)) return 'All-In already used this week.';
  return msg;
}

// POST /api/picks/:gameId  -> lock_pick_all_groups
export const POST: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;
  const body = (await event.request.json()) as Body;

  if (!body.team || !body.weight) {
    return json({ ok: false, reason: 'missing team/weight' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('lock_pick_all_groups', {
    p_game_id: gameId,
    p_side: body.team,
    p_weight: body.weight
  });

  if (error) {
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

  const rows = (Array.isArray(data) ? data : [data]) as FanOutRow[];
  const succeeded = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok);

  if (succeeded.length === 0) {
    // all groups failed — surface the first reason as a hard error
    const firstReason = normalizeFanOutError(failed[0]?.reason ?? 'Could not save pick');
    return json({ ok: false, reason: firstReason }, { status: 409 });
  }

  // Use locked_at from the active (switched) group, falling back to any succeeded row
  const activeGroupId = event.locals.groupId;
  const activeRow = succeeded.find((r) => r.group_id === activeGroupId) ?? succeeded[0];

  return json({
    ok: true,
    applied: succeeded.length,
    skipped: failed.map((r) => ({
      groupId: r.group_id,
      reason: normalizeFanOutError(r.reason ?? '')
    })),
    locked_at: activeRow?.locked_at ?? null
  });
};

// DELETE /api/picks/:gameId -> unlock_pick_all_groups
export const DELETE: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;

  const { data, error } = await supabase.rpc('unlock_pick_all_groups', { p_game_id: gameId });

  if (error) {
    const msg = error.message ?? '';
    if (/game started/i.test(msg) || /after kickoff/i.test(msg)) {
      return json({ ok: false, reason: 'Cannot unlock after kickoff.' }, { status: 409 });
    }
    throw httpError(500, msg);
  }

  const rows = (Array.isArray(data) ? data : [data]) as FanOutRow[];
  const succeeded = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok);

  if (succeeded.length === 0 && failed.length > 0) {
    const firstReason = failed[0]?.reason ?? 'Could not unlock pick';
    return json({ ok: false, reason: firstReason }, { status: 409 });
  }

  return json({
    ok: true,
    applied: succeeded.length,
    skipped: failed.map((r) => ({ groupId: r.group_id, reason: r.reason ?? '' }))
  });
};
