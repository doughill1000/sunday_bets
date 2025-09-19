// src/lib/server/db/commands/setActiveLine.ts
import { supabaseService } from '$lib/supabase/service';

type SetActiveLineResult = {
  ok: boolean;
  deactivated: number;
  line: {
    id: number;
    game_id: string;
    source: string;
    spread_team_id: number;
    spread_value: number;
    is_active_line: boolean;
    fetched_at: string;
  };
};

export async function setActiveLine(params: {
  gameId: string;
  spreadTeamId: number;
  spreadValue: number;
  source: string;
}): Promise<SetActiveLineResult> {
  const { data, error } = await supabaseService.rpc('set_active_line', {
    p_game_id: params.gameId,
    p_spread_team_id: params.spreadTeamId,
    p_spread_value: params.spreadValue,
    p_source: params.source
  });
  if (error) throw error;

  const payload = Array.isArray(data) ? data[0] : data;
  // minimal runtime guard
  if (!payload || typeof payload !== 'object' || !('ok' in payload)) {
    throw new Error('set_active_line: unexpected RPC payload');
  }
  return payload as SetActiveLineResult;
}