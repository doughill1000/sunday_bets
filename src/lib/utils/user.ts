import type { User } from '@supabase/supabase-js';

// Returns a 1–2 character avatar fallback (e.g., "JD", "DO", or "U")
export function userNameShort(user: User | null): string {
  if (!user) return 'U';
  const full = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || 'U';

  // If full name has spaces, use first + last initials
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Otherwise take first 2 chars
  return full.slice(0, 2).toUpperCase();
}

export function shortName(full: string): string {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2); // single-word usernames
  // initials, up to 3 (e.g., "Patrick Mahomes" -> "PM")
  return parts
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
