import { gameLines } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '$lib/server/db';

export async function deactivateActiveLines(tx: DbOrTx, gameId: string) {
  await tx
    .update(gameLines)
    .set({ isActiveLine: false })
    .where(and(
      eq(gameLines.gameId, gameId),
      eq(gameLines.isActiveLine, true)
    ));
}