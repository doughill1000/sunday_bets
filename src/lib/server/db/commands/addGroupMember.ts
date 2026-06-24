import { supabaseService } from '$lib/supabase/service';
import { randomBytes } from 'crypto';

export interface AddGroupMemberParams {
  email: string;
  displayName: string;
  password?: string;
  groupId: string;
}

export interface AddGroupMemberResult {
  userId: string;
  email: string;
  displayName: string;
  temporaryPassword: string;
}

function genPassword(): string {
  return randomBytes(12).toString('base64url');
}

export async function addGroupMember(params: AddGroupMemberParams): Promise<AddGroupMemberResult> {
  const password = params.password || genPassword();

  const { data, error: createErr } = await supabaseService.auth.admin.createUser({
    email: params.email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: params.displayName }
  });
  if (createErr) throw createErr;

  const userId = data.user.id;

  const { error: memberErr } = await supabaseService.from('group_memberships').insert({
    group_id: params.groupId,
    user_id: userId,
    role: 'member'
  });
  if (memberErr) throw memberErr;

  return {
    userId,
    email: params.email.trim().toLowerCase(),
    displayName: params.displayName,
    temporaryPassword: password
  };
}
