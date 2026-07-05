// Season standings — computed on-device from the group's pick_settlement rows
// (the precomputed leaderboard matview is service-role-only; see
// src/domain/leaderboard.ts for the mirrored aggregation rules).
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CenteredMessage, CenteredSpinner } from '@/components/centered';
import { UserAvatar } from '@/components/user-avatar';
import { formatRecord, formatSignedPoints } from '@/domain/format';
import { aggregateSeasonStandings } from '@/domain/leaderboard';
import { isDropWorstWeekActive } from '@/domain/scoring';
import type { StandingsRow } from '@/domain/types';
import { useActiveGroup } from '@/lib/active-group';
import { useActiveWeek, useGroupConfig, useSeasonFacts, useSeasons } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useTheme } from '@/hooks/use-theme';

export default function LeaderboardScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const myUserId = session?.user.id ?? null;
  const { activeGroupId, activeGroup } = useActiveGroup();

  const seasons = useSeasons();
  const activeWeek = useActiveWeek();
  const config = useGroupConfig(activeGroupId);

  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const defaultYear = activeWeek.data?.seasonYear ?? seasons.data?.[0]?.year ?? null;
  const seasonYear = pickedYear ?? defaultYear;

  const facts = useSeasonFacts(activeGroupId, seasonYear);

  const standings = useMemo<StandingsRow[] | null>(() => {
    if (!facts.data || seasonYear == null) return null;
    return aggregateSeasonStandings(
      facts.data.facts,
      facts.data.users,
      config.data?.scoringRules ?? null,
      seasonYear
    );
  }, [facts.data, config.data?.scoringRules, seasonYear]);

  if (seasons.isPending || activeWeek.isPending || config.isPending) return <CenteredSpinner />;
  const setupError = seasons.error ?? activeWeek.error ?? config.error;
  if (setupError) {
    return (
      <CenteredMessage
        title="Couldn’t load standings"
        detail={(setupError as Error).message}
        actionLabel="Retry"
        onAction={() => void queryClient.invalidateQueries()}
      />
    );
  }

  const dropActive =
    seasonYear != null && isDropWorstWeekActive(config.data?.scoringRules ?? null, seasonYear);

  const onRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['season-facts'] });
    void queryClient.invalidateQueries({ queryKey: ['group-config'] });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Standings</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {activeGroup?.groupName ?? ''}
          </Text>
        </View>

        {(seasons.data?.length ?? 0) > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.seasonRow}>
              {seasons.data!.map((s) => {
                const selected = s.year === seasonYear;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setPickedYear(s.year)}
                    style={[
                      styles.seasonChip,
                      {
                        borderColor: selected ? theme.tint : theme.border,
                        backgroundColor: selected
                          ? theme.backgroundSelected
                          : theme.backgroundElement
                      }
                    ]}
                  >
                    <Text
                      style={[styles.seasonChipText, { color: selected ? theme.tint : theme.text }]}
                    >
                      {s.year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {dropActive && (
          <Text style={[styles.dropNote, { color: theme.textSecondary }]}>
            Each player’s worst week is dropped from season totals (record still counts it).
          </Text>
        )}
      </View>

      {facts.isPending || standings == null ? (
        <CenteredSpinner />
      ) : facts.error ? (
        <CenteredMessage
          title="Couldn’t load results"
          detail={(facts.error as Error).message}
          actionLabel="Retry"
          onAction={onRefresh}
        />
      ) : (
        <FlatList
          data={standings}
          keyExtractor={(row) => row.userId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={facts.isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.tint}
            />
          }
          ListEmptyComponent={
            <CenteredMessage
              title={`No results for ${seasonYear}`}
              detail="Standings fill in once picks are graded."
            />
          }
          renderItem={({ item: row }) => {
            const isMe = row.userId === myUserId;
            const detailParts = [formatRecord(row.wins, row.losses, row.pushes)];
            if (row.missed > 0) detailParts.push(`${row.missed} missed`);
            if (row.droppedWeekPoints != null) {
              detailParts.push(`worst wk ${formatSignedPoints(row.droppedWeekPoints)} dropped`);
            }
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  isMe && { borderColor: theme.tint }
                ]}
              >
                <Text style={[styles.rank, { color: theme.textSecondary }]}>{row.rank}</Text>
                <UserAvatar size="md" avatarKey={row.avatarKey} displayName={row.displayName} />
                <View style={styles.nameBlock}>
                  <Text
                    numberOfLines={1}
                    style={[styles.name, { color: theme.text }, isMe && styles.nameMe]}
                  >
                    {row.displayName}
                    {isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.record, { color: theme.textSecondary }]}>
                    {detailParts.join(' · ')}
                  </Text>
                </View>
                <Text style={[styles.points, { color: theme.text }]}>{row.totalPoints}</Text>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 6
  },
  seasonChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  seasonChipText: {
    fontSize: 14,
    fontWeight: '700'
  },
  dropNote: {
    fontSize: 12,
    lineHeight: 16
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  rank: {
    width: 22,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center'
  },
  nameBlock: {
    flex: 1,
    gap: 1
  },
  name: {
    fontSize: 15,
    fontWeight: '600'
  },
  nameMe: {
    fontWeight: '800'
  },
  record: {
    fontSize: 12
  },
  points: {
    fontSize: 20,
    fontWeight: '800'
  },
  separator: {
    height: 8
  }
});
