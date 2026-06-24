import { post } from '$lib/api';

export interface AddMemberParams {
  email: string;
  displayName: string;
  password?: string;
  groupId?: string;
}

export interface AddMemberResult {
  ok: true;
  userId: string;
  email: string;
  displayName: string;
  temporaryPassword: string;
}

export function addMember(params: AddMemberParams) {
  return post<AddMemberResult>('/api/admin/add-member', params);
}
