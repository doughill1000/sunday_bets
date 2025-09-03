import type { User } from '@supabase/supabase-js';

export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const am: any = user.app_metadata ?? {};
  const um: any = user.user_metadata ?? {};

  // Support multiple shapes: role, roles[], is_admin flag
  const roles = new Set<string>(
    [am.role, um.role, ...(am.roles ?? []), ...(um.roles ?? [])].filter(Boolean)
  );
  if (roles.has('admin')) return true;
  if (am.is_admin === true || um.is_admin === true) return true;

  return false;
}