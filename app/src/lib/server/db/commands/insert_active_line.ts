import { gameLines } from '../../../../db/schema';
import type { DbOrTx } from '../types';

export async function insertActiveLine(tx: DbOrTx, gameId: string, spreadTeamId: number, spreadValue: number) {
  await tx.insert(gameLines).values({
    gameId,
    source: 'fanduel',
    spreadTeamId,
    spreadValue: String(spreadValue),
    fetchedAt: new Date().toISOString(),
    isActiveLine: true
  });
}