import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema'; 
import { DATABASE_URL } from '$env/static/private';

const client = postgres(DATABASE_URL, {
  // good defaults for serverless
  max: 1,                // keep it tiny; pgbouncer handles pooling
  idle_timeout: 10,      // seconds
  connect_timeout: 30,   // seconds
  ssl: 'require'         // plays nice with Supabase
});

export const db = drizzle(client, { schema });
