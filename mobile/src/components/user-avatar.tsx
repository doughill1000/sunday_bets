// Preset-emoji avatar with initials fallback — mobile port of UserAvatar.svelte.
import { StyleSheet, Text, View } from 'react-native';

import { getPreset, initialsColor, shortName } from '@/domain/avatars';

const SIZES = {
  sm: { circle: 28, font: 12 },
  md: { circle: 36, font: 14 },
  lg: { circle: 56, font: 22 }
} as const;

export type UserAvatarProps = {
  avatarKey?: string | null;
  displayName: string | null;
  size?: keyof typeof SIZES;
};

export function UserAvatar({ avatarKey, displayName, size = 'sm' }: UserAvatarProps) {
  const preset = getPreset(avatarKey);
  const name = displayName ?? '';
  const dims = SIZES[size];
  const background = preset ? preset.bg : initialsColor(name);
  const label = preset ? preset.emoji : shortName(name) || '?';

  return (
    <View
      style={[
        styles.circle,
        {
          width: dims.circle,
          height: dims.circle,
          borderRadius: dims.circle / 2,
          backgroundColor: background
        }
      ]}
    >
      <Text style={[styles.label, { fontSize: dims.font }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
