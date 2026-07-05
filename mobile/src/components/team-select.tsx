// Two-button team picker (away @ home) with the signed spread per side —
// mobile port of TeamSelect.svelte.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { signedSpreadForTeam } from '@/domain/spread';
import { teamColor } from '@/domain/teams';
import type { PickGame, TeamSide } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export type TeamSelectProps = {
  game: PickGame;
  selectedTeam: TeamSide | undefined;
  canChange: boolean;
  onSelect: (team: TeamSide) => void;
};

export function TeamSelect({ game, selectedTeam, canChange, onSelect }: TeamSelectProps) {
  const theme = useTheme();

  const renderSide = (side: TeamSide) => {
    const name = side === 'home' ? game.home : game.away;
    const selected = selectedTeam === side;
    const accent = teamColor(name) ?? theme.tint;
    return (
      <Pressable
        key={side}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: !canChange }}
        disabled={!canChange}
        onPress={() => onSelect(side)}
        style={[
          styles.side,
          {
            borderColor: selected ? theme.tint : theme.border,
            backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement
          },
          !canChange && styles.disabled
        ]}
      >
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        </View>
        <Text style={[styles.spread, { color: theme.textSecondary }]}>
          {signedSpreadForTeam(game, side).trim() || '—'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.row}>
      {renderSide('away')}
      {renderSide('home')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8
  },
  side: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2
  },
  disabled: {
    opacity: 0.6
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  name: {
    fontSize: 16,
    fontWeight: '700'
  },
  spread: {
    fontSize: 13,
    fontWeight: '600'
  }
});
