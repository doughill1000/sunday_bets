import { utils as xlsxUtils } from 'xlsx';
import { normalizeTeamCode, parseWeightCell, toNum, Weight } from './parsers.js';
import { findOrCreateGame, upsertPick } from './db.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function importLongWeekSheet(params: {
  supabase: SupabaseClient;
  wb: any;
  sheetName: string;
  weekId: number;
  teamMap: Map<string, number>;
  userColumns: Record<string, string>;
  options: {
    fallbackKickoff?: string;
    lockAtKickoff: boolean;
    dryRun: boolean;
  };
}) {
  const { supabase, wb, sheetName, weekId, teamMap, userColumns, options } = params;
  const scoreCol = 8;
  const grid: any[][] = xlsxUtils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  if (!grid.length) return;

  const header: string[] = (grid[0] ?? []).map((c: any) => String(c ?? '').trim());
  const playerHeaders = Object.keys(userColumns);

  // Locate player columns by exact header match
  const playerCols: Array<{ name: string; col: number }> = [];
  for (const name of playerHeaders) {
    const idx = header.findIndex((h) => h.trim() === name.trim());
    if (idx >= 0) playerCols.push({ name, col: idx });
  }

  // Heuristic: team code in column 0; line/spread column auto-detected
  const teamCol = 0;

  let lineCol = header.findIndex((h) => /^(line|spread|Odds)$/i.test(h));
  if (lineCol < 0) {
    for (let c = 1; c < header.length; c++) {
      let total = 0,
        nums = 0;
      for (let r = 1; r < Math.min(grid.length, 12); r++) {
        const val = grid[r]?.[c];
        if (val !== '' && val !== undefined) {
          total++;
          if (toNum(val) !== undefined) nums++;
        }
      }
      if (total >= 4 && nums / total >= 0.6) {
        lineCol = c;
        break;
      }
    }
  }
  if (lineCol < 0) {
    console.warn(`[${sheetName}] Could not detect a Line/Spread column — skipping.`);
    return;
  }

  const kickoffCol = header.findIndex((h) => /^(kickoff|date|start|time)$/i.test(h));

  // Consume two rows at a time: [AwayRow, HomeRow]
  for (let r = 2; r < grid.length; r += 3) {
    const awayRow = grid[r] || [];
    const homeRow = grid[r + 1] || [];

    const awayCode = normalizeTeamCode(String(awayRow[teamCol] ?? ''));
    const homeCode = normalizeTeamCode(String(homeRow[teamCol] ?? ''));

    const awayId = teamMap.get(awayCode);
    const homeId = teamMap.get(homeCode);
    if (!awayId || !homeId) {
      console.log(`[${sheetName}] Skipping game ${awayCode}@${homeCode}: Missing team ID`);
      continue; // empty/separator rows
    }

    const awayLine = toNum(awayRow[lineCol]);
    const homeLine = toNum(homeRow[lineCol]);
    if (awayLine === undefined || homeLine === undefined) {
      console.warn(`[${sheetName}] Missing lines for ${awayCode} @ ${homeCode} — skipping game.`);
      continue;
    }

    const rawKickoff =
      kickoffCol >= 0 ? awayRow[kickoffCol] || homeRow[kickoffCol] || undefined : undefined;

    let gameId: string;
    try {
      gameId = await findOrCreateGame({
        supabase,
        weekId,
        homeTeamId: homeId,
        awayTeamId: awayId,
        rawKickoff,
        fallbackKickoff: options.fallbackKickoff,
        dryRun: options.dryRun
      });

      const { error } = await supabase
        .from('games')
        .update({
          final_scores: { home: homeRow[scoreCol], away: awayRow[scoreCol] },
          status: 'final'
        })
        .eq('id', gameId);

      if (error) throw error;

      console.log('Found or created game', gameId, `${awayCode}@${homeCode}`, `(${awayLine}, ${homeLine})`);
    } catch (e) {
      console.log(`Skipping game ${awayCode}@${homeCode}: ${(e as Error).message}`);
      continue;
    }

    // Favorite & spread snapshot (negative value belongs to favorite)
    let favTeamId: number | undefined;
    let spreadValue: number | undefined;
    if (awayLine < 0) {
      favTeamId = awayId;
      spreadValue = awayLine;
    } else if (homeLine < 0) {
      favTeamId = homeId;
      spreadValue = homeLine;
    } else {
      favTeamId = homeId;
      spreadValue = 0;
    } // PK or both positive

    // Each player's pick is the row they marked with a weight
    for (const { name, col } of playerCols) {
      const wAway = parseWeightCell(awayRow[col]);
      const wHome = parseWeightCell(homeRow[col]);

      if (!wAway && !wHome) continue;
      if (wAway && wHome) {
        console.warn(
          `[${sheetName}] Ambiguous pick for ${name} on ${awayCode}@${homeCode}; skipping.`
        );
        continue;
      }

      const pickedTeamId = wAway ? awayId : homeId;
      const weight = (wAway ?? wHome) as Weight;

      await upsertPick({
        supabase,
        userId: userColumns[name],
        gameId,
        pickedTeamId,
        weight,
        lockAtKickoff: options.lockAtKickoff,
        lineTeamId: favTeamId,
        lineValue: spreadValue,
        dryRun: options.dryRun,
        locked_by: userColumns[name]
      });

      // console.log(`${name} picks ${wAway ? awayCode : homeCode} (${weight})`);
    }
  }
}
