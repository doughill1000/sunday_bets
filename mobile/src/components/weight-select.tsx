// Weight chips (Low 1 / Medium 3 / High 5 / All-In 10) — mobile port of
// WeightSelect.svelte. The All-In confirm/move flow lives in the parent card
// (native Alert), so this stays a dumb chip row.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WEIGHT_ORDER, WEIGHTS } from '@/domain/scoring';
import type { WeightCode } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export type WeightSelectProps = {
  selectedWeight: WeightCode | undefined;
  canChange: boolean;
  /** Disables just the All-In chip (another game's All-In already kicked off). */
  allInBlocked: boolean;
  onSelect: (weight: WeightCode) => void;
};

export function WeightSelect({
  selectedWeight,
  canChange,
  allInBlocked,
  onSelect
}: WeightSelectProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {WEIGHT_ORDER.map((code) => {
        const w = WEIGHTS[code];
        const selected = selectedWeight === code;
        const disabled = !canChange || (code === 'A' && allInBlocked);
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(code)}
            style={[
              styles.chip,
              {
                borderColor: selected ? theme.tint : theme.border,
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement
              },
              disabled && styles.disabled
            ]}
          >
            <Text style={[styles.label, { color: selected ? theme.tint : theme.text }]}>
              {w.label}
            </Text>
            <Text style={[styles.points, { color: theme.textSecondary }]}>{w.points}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6
  },
  chip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center'
  },
  disabled: {
    opacity: 0.5
  },
  label: {
    fontSize: 13,
    fontWeight: '700'
  },
  points: {
    fontSize: 11,
    fontWeight: '600'
  }
});
