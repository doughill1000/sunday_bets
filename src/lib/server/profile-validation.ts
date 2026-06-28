export function validateDisplayName(
  value: unknown
): { ok: true; value: string } | { ok: false; reason: string } {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length === 0) return { ok: false, reason: 'Display name cannot be blank.' };
  if (trimmed.length > 40)
    return { ok: false, reason: 'Display name must be 40 characters or fewer.' };
  return { ok: true, value: trimmed };
}
