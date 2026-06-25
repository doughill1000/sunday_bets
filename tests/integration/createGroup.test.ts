// tests/integration/createGroup.test.ts
//
// Integration coverage for the gated create-group flow (#148, ADR-0006 dec. 3).
// Drives public.create_group through user-scoped clients (real JWT → auth.uid())
// so the gate, atomic seed, and commissioner membership are exercised end-to-end
// against the live local Supabase stack.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import { ensureAuthUsers, deleteAuthUsers } from './fixtures/db';

const admin = createServiceClient();

const CAPABLE_ID = '00000000-0000-0000-0000-000000003001';
const INCAPABLE_ID = '00000000-0000-0000-0000-000000003002';
const ALL_IDS = [CAPABLE_ID, INCAPABLE_ID];

// Groups created during the run, tracked so afterAll can remove them (cascades
// to group_config + group_memberships).
const createdGroupIds: string[] = [];

async function setMode(mode: 'gated' | 'open') {
  const { error } = await admin
    .from('settings')
    .upsert({ id: true, group_creation_mode: mode }, { onConflict: 'id' });
  if (error) throw new Error(`setMode(${mode}): ${error.message}`);
}

beforeAll(async () => {
  await ensureAuthUsers([
    { id: CAPABLE_ID, email: 'cg-capable@example.com', displayName: 'CG Capable' },
    { id: INCAPABLE_ID, email: 'cg-incapable@example.com', displayName: 'CG Incapable' }
  ]);

  const { error } = await admin.from('users').upsert(
    [
      { id: CAPABLE_ID, display_name: 'CG Capable', role: 'player', can_create_group: true },
      { id: INCAPABLE_ID, display_name: 'CG Incapable', role: 'player', can_create_group: false }
    ],
    { onConflict: 'id' }
  );
  if (error) throw new Error('seed users: ' + error.message);
});

afterAll(async () => {
  if (createdGroupIds.length > 0) {
    await admin.from('groups').delete().in('id', createdGroupIds);
  }
  await setMode('gated'); // restore default for other suites
  await deleteAuthUsers(ALL_IDS);
});

describe('create_group — gated mode', () => {
  beforeAll(() => setMode('gated'));

  it('capable user creates a group, becoming its commissioner with seeded config', async () => {
    const asCapable = createUserClient(CAPABLE_ID);
    const { data: groupId, error } = await asCapable.rpc('create_group', {
      p_name: 'Gated Capable Group'
    });

    expect(error).toBeNull();
    expect(typeof groupId).toBe('string');
    createdGroupIds.push(groupId as string);

    // Membership: creator is an active commissioner.
    const { data: membership } = await admin
      .from('group_memberships')
      .select('role, status')
      .eq('group_id', groupId as string)
      .eq('user_id', CAPABLE_ID)
      .single();
    expect(membership?.role).toBe('commissioner');
    expect(membership?.status).toBe('active');

    // group_config was seeded.
    const { data: config } = await admin
      .from('group_config')
      .select('group_id, line_source')
      .eq('group_id', groupId as string)
      .single();
    expect(config?.line_source).toBe('fanduel');

    // The group row carries the trimmed name.
    const { data: group } = await admin
      .from('groups')
      .select('name')
      .eq('id', groupId as string)
      .single();
    expect(group?.name).toBe('Gated Capable Group');
  });

  it('incapable user is blocked (P0012) and creates no group', async () => {
    const asIncapable = createUserClient(INCAPABLE_ID);
    const { data, error } = await asIncapable.rpc('create_group', {
      p_name: 'Should Not Exist'
    });

    expect(data).toBeNull();
    expect(error?.code).toBe('P0012');

    const { data: groups } = await admin.from('groups').select('id').eq('name', 'Should Not Exist');
    expect(groups).toHaveLength(0);
  });

  it('rejects a blank name (P0010)', async () => {
    const asCapable = createUserClient(CAPABLE_ID);
    const { error } = await asCapable.rpc('create_group', { p_name: '   ' });
    expect(error?.code).toBe('P0010');
  });

  it('rejects an overlong name (P0011)', async () => {
    const asCapable = createUserClient(CAPABLE_ID);
    const { error } = await asCapable.rpc('create_group', { p_name: 'x'.repeat(61) });
    expect(error?.code).toBe('P0011');
  });
});

describe('create_group — open mode', () => {
  beforeAll(() => setMode('open'));
  afterAll(() => setMode('gated'));

  it('non-capable user can create a group when mode is open', async () => {
    const asIncapable = createUserClient(INCAPABLE_ID);
    const { data: groupId, error } = await asIncapable.rpc('create_group', {
      p_name: 'Open Mode Group'
    });

    expect(error).toBeNull();
    expect(typeof groupId).toBe('string');
    createdGroupIds.push(groupId as string);

    const { data: membership } = await admin
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId as string)
      .eq('user_id', INCAPABLE_ID)
      .single();
    expect(membership?.role).toBe('commissioner');
  });
});
