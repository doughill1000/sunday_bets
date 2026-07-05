// Avatar presets — port of the web app's src/lib/avatars.ts (keep keys in sync;
// avatar_key values in the users table reference these presets).
export interface AvatarPreset {
  key: string;
  emoji: string;
  bg: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'football', emoji: '🏈', bg: '#7c3aed' },
  { key: 'fire', emoji: '🔥', bg: '#dc2626' },
  { key: 'trophy', emoji: '🏆', bg: '#d97706' },
  { key: 'shark', emoji: '🦈', bg: '#0284c7' },
  { key: 'goat', emoji: '🐐', bg: '#16a34a' },
  { key: 'lightning', emoji: '⚡', bg: '#ca8a04' },
  { key: 'skull', emoji: '💀', bg: '#475569' },
  { key: 'crown', emoji: '👑', bg: '#b45309' },
  { key: 'rocket', emoji: '🚀', bg: '#7c3aed' },
  { key: 'wolf', emoji: '🐺', bg: '#374151' },
  { key: 'clover', emoji: '🍀', bg: '#15803d' },
  { key: 'ghost', emoji: '👻', bg: '#6b7280' }
];

const PRESET_MAP = new Map(AVATAR_PRESETS.map((p) => [p.key, p]));

export function getPreset(key: string | null | undefined): AvatarPreset | null {
  if (!key) return null;
  return PRESET_MAP.get(key) ?? null;
}

// Deterministic color palette for initials fallback
const INITIAL_COLORS = [
  '#7c3aed',
  '#0284c7',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#0891b2',
  '#9333ea',
  '#be123c'
];

export function initialsColor(displayName: string): string {
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash * 31 + displayName.charCodeAt(i)) & 0xffffffff;
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

/** Avatar-fallback initials — mirrors src/lib/utils/user.ts shortName in the web app. */
export function shortName(full: string | null | undefined): string {
  if (!full) return '';
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2); // single-word usernames
  // initials, up to 3 (e.g., "Patrick Mahomes" -> "PM")
  return parts
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
