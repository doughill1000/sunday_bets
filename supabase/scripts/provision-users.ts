#!/usr/bin/env tsx
/**
 * Provision password-login accounts for the (small, known) set of players.
 *
 * Supabase's built-in email service is rate-limited and customizing email
 * templates now requires custom SMTP, so for a private ~6-person app we skip
 * magic links and create accounts directly with the service-role admin API.
 * Created users are email-confirmed immediately (no confirmation email is sent),
 * and the `on_auth_user_created` trigger mirrors each into public.users
 * (display_name from metadata/email, role='player').
 *
 * Usage:
 *   tsx supabase/scripts/provision-users.ts --env=.env.local --file=supabase/scripts/users.json
 *   tsx supabase/scripts/provision-users.ts --env=.env.production --file=supabase/scripts/users.json --dry-run
 *
 * users.json shape (copy users.example.json). password optional — omit to
 * auto-generate a strong one; displayName/role optional:
 *   [
 *     { "email": "alice@example.com", "password": "chosen-pw", "displayName": "Alice" },
 *     { "email": "doug@example.com", "role": "admin" }
 *   ]
 *
 * Re-running is idempotent: existing users have their password reset and email
 * re-confirmed; new users are created.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const arg = (prefix: string) =>
  process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);

const envFile = arg('--env=') ?? '.env.local';
const usersFile = arg('--file=');
const dryRun = process.argv.includes('--dry-run');

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const must = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k} in ${envFile}`);
    process.exit(1);
  }
  return v;
};

if (!usersFile) {
  console.error('Pass --file=<path to users.json> (copy supabase/scripts/users.example.json)');
  process.exit(1);
}

const url = must('PUBLIC_SUPABASE_URL');
const serviceKey = must('SUPABASE_SERVICE_ROLE');

type UserSpec = { email: string; password?: string; displayName?: string; role?: string };

const specs: UserSpec[] = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), usersFile), 'utf8')
);
if (!Array.isArray(specs) || specs.some((s) => !s?.email)) {
  console.error('users file must be a JSON array of { email, password?, displayName?, role? }');
  process.exit(1);
}

// ~16 url-safe chars; strong enough for a private app, easy to share/retype.
const genPassword = () => randomBytes(12).toString('base64url');

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function existingUsersByEmail() {
  const byEmail = new Map<string, string>(); // email -> auth user id
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      // Admin errors sometimes arrive with no enumerable `message`, which would
      // otherwise surface as a useless `{}`. Wrap with context + the likely cause.
      const detail = error.message || error.name || JSON.stringify(error);
      throw new Error(
        `Admin listUsers failed (page ${page}): ${detail} — ` +
          `check SUPABASE_SERVICE_ROLE in ${envFile} is the service-role key for ${url}`
      );
    }
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return byEmail;
}

async function main() {
  console.log(`Target:     ${url}`);
  console.log(`Env file:   ${envFile}`);
  console.log(`Users file: ${usersFile}`);
  if (dryRun) console.log('Mode: DRY RUN (no writes)');
  console.log('');

  const existing = await existingUsersByEmail();
  const results: { email: string; action: string; password: string }[] = [];

  for (const spec of specs) {
    const email = spec.email.trim().toLowerCase();
    const password = spec.password ?? genPassword();
    const user_metadata = spec.displayName ? { display_name: spec.displayName } : undefined;
    const id = existing.get(email);

    if (dryRun) {
      results.push({ email, action: id ? 'would update' : 'would create', password });
      continue;
    }

    let userId = id;
    if (id) {
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password,
        email_confirm: true,
        ...(user_metadata ? { user_metadata } : {})
      });
      if (error) {
        console.error(`✗ ${email}: ${error.message}`);
        continue;
      }
      results.push({ email, action: 'updated', password });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        ...(user_metadata ? { user_metadata } : {})
      });
      if (error) {
        console.error(`✗ ${email}: ${error.message}`);
        continue;
      }
      userId = data.user?.id;
      results.push({ email, action: 'created', password });
    }

    // The signup trigger always sets role='player'; only the service role can
    // promote. Apply an explicit role when requested.
    if (spec.role && userId) {
      const { error } = await supabase.from('users').update({ role: spec.role }).eq('id', userId);
      if (error) console.error(`  ! ${email}: could not set role=${spec.role}: ${error.message}`);
    }
  }

  console.log('Results:');
  for (const r of results) {
    console.log(`  ${r.action.padEnd(12)} ${r.email.padEnd(32)} ${r.password}`);
  }
  console.log(
    `\n${dryRun ? 'Would process' : 'Processed'} ${results.length}/${specs.length} user(s).`
  );
  if (!dryRun) {
    console.log(
      'Share each password with its owner privately; they can change it after first login.'
    );
  }
}

main().catch((err) => {
  console.error('\n❌ Provisioning failed.');
  // Print the full error — Error instances show their stack/message; anything
  // else is dumped so a message-less object can't hide the real cause as `{}`.
  console.error(err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : err);
  if (err?.status) console.error(`  status: ${err.status}`);
  if (err?.code) console.error(`  code: ${err.code}`);
  process.exit(1);
});
