import type { dbClient } from './dbClient';

export type TX = Parameters<Parameters<(typeof dbClient)['transaction']>[0]>[0];
export type DbOrTx = typeof dbClient | TX;
