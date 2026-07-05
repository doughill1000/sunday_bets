// Compact board summary — mobile port of PicksSummaryBar.svelte.
import { StyleSheet, Text, View } from 'react-native';

import { findAllInHolder, pickStatus } from '@/domain/rules';
import { WEIGHT_ORDER } from '@/domain/scoring';
import type { PickEntry, PickGame } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export type PicksSummaryProps = {
  games: PickGame[];
  entries: Record<string, PickEntry>;
  now: number;
};

export function PicksSummary({ games, entries, now }: PicksSummaryProps) {
  const theme = useTheme();

  const statuses = games.map((g) => pickStatus(entries[g.id], g.kickoff, now));
  const savedCount = statuses.filter((s) => s === 'saved').length;
  const openCount = statuses.filter((s) => s === 'open').length;
  const missedCount = statuses.filter((s) => s === 'missed').length;

  const allIn = findAllInHolder(games, entries);
  const allInTeam = allIn ? (allIn.team === 'home' ? allIn.game.home : allIn.game.away) : null;

  const weightCounts = WEIGHT_ORDER.map((code) => ({
    code,
    count: games.filter((g) => entries[g.id]?.lockedPick?.weight === code).length
  })).filter((w) => w.count > 0);

  return (
    <View
      style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <View style={styles.row}>
        <Text style={[styles.primary, { color: theme.text }]}>
          {savedCount}/{games.length} saved
        </Text>
        {openCount > 0 ? (
          <Text style={[styles.secondary, { color: theme.push }]}>· {openCount} to pick</Text>
        ) : savedCount > 0 ? (
          <Text style={[styles.secondary, { color: theme.textSecondary }]}>✓ All saved</Text>
        ) : null}
      </View>
      <View style={styles.row}>
        {allIn?.locked ? (
          <Text style={[styles.secondary, { color: theme.textSecondary }]}>
            All-In: <Text style={{ color: theme.text, fontWeight: '600' }}>{allInTeam}</Text> ✓
          </Text>
        ) : allIn ? (
          <Text style={[styles.secondary, { color: theme.push }]}>
            All-In: {allInTeam} · not saved yet
          </Text>
        ) : (
          <Text
            style={[styles.secondary, { color: openCount > 0 ? theme.push : theme.textSecondary }]}
          >
            No All-In
          </Text>
        )}
        {missedCount > 0 && (
          <Text style={[styles.secondary, { color: theme.loss, fontWeight: '600' }]}>
            · {missedCount} missed
          </Text>
        )}
        {weightCounts.length > 0 && (
          <Text style={[styles.weights, { color: theme.textSecondary }]}>
            {weightCounts.map((w) => `${w.code} ${w.count}`).join('  ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap'
  },
  primary: {
    fontSize: 14,
    fontWeight: '700'
  },
  secondary: {
    fontSize: 12
  },
  weights: {
    fontSize: 12,
    marginLeft: 'auto'
  }
});
