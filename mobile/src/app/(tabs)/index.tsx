// Picks board — the mobile counterpart of the web /picks page. Games and picks
// stream straight from Supabase under RLS; saves fan out through the same
// lock_pick_all_groups RPC the web app uses.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CenteredMessage, CenteredSpinner } from '@/components/centered';
import { GameCard } from '@/components/game-card';
import { PicksSummary } from '@/components/picks-summary';
import { allInIntent, kickoffPassed } from '@/domain/rules';
import type { GroupPickEntry, PickGame, WeightCode } from '@/domain/types';
import { useActiveGroup } from '@/lib/active-group';
import { usePicksBoard } from '@/lib/picks-board';
import {
  useActiveWeek,
  useGroupConfig,
  useGroupPicks,
  useMyPicks,
  useMySettlements,
  useWeekGames,
  type ActiveWeek
} from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useTheme } from '@/hooks/use-theme';

// The settings row that carries this flag is admin-only under RLS, so the client
// assumes the server default (true); lock_pick_all_groups re-checks it regardless.
const FINAL_WEEK_UNLIMITED_ALLIN = true;

export default function PicksScreen() {
  const { activeGroup, activeGroupId } = useActiveGroup();
  const week = useActiveWeek();

  if (week.isPending) return <CenteredSpinner />;
  if (week.isError) {
    return (
      <CenteredMessage
        title="Couldn’t load the current week"
        detail={(week.error as Error).message}
        actionLabel="Retry"
        onAction={() => void week.refetch()}
      />
    );
  }
  if (!week.data || !activeGroupId) {
    return (
      <CenteredMessage
        title="No week to show"
        detail="There’s no started NFL week in the database yet. Check back when the season is loaded."
      />
    );
  }

  return (
    <Board
      // Remount the whole board when the week or group changes so staged state
      // never leaks across contexts.
      key={`${week.data.id}:${activeGroupId}`}
      week={week.data}
      groupId={activeGroupId}
      groupName={activeGroup?.groupName ?? ''}
    />
  );
}

function Board({
  week,
  groupId,
  groupName
}: {
  week: ActiveWeek;
  groupId: string;
  groupName: string;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const config = useGroupConfig(groupId);
  const games = useWeekGames(week.id, config.data?.lineSource);
  const myPicks = useMyPicks(week.id, groupId);
  const groupPicks = useGroupPicks(week.id, groupId);
  const settlements = useMySettlements(week.id, groupId, userId);

  const board = usePicksBoard(games.data ?? [], myPicks.data, groupId, {
    isLastWeek: week.isLastWeek,
    finalWeekUnlimitedAllin: FINAL_WEEK_UNLIMITED_ALLIN
  });

  // Re-evaluate kickoff-passed state periodically so cards lock on time even
  // without a refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const groupPicksByGame = useMemo(() => {
    const byGame = new Map<string, GroupPickEntry[]>();
    for (const p of groupPicks.data ?? []) {
      const list = byGame.get(p.gameId) ?? [];
      list.push(p);
      byGame.set(p.gameId, list);
    }
    return byGame;
  }, [groupPicks.data]);

  if (config.isPending || games.isPending || myPicks.isPending) return <CenteredSpinner />;
  const loadError = config.error ?? games.error ?? myPicks.error;
  if (loadError) {
    return (
      <CenteredMessage
        title="Couldn’t load the board"
        detail={(loadError as Error).message}
        actionLabel="Retry"
        onAction={() => void queryClient.invalidateQueries()}
      />
    );
  }

  const gameList = games.data ?? [];

  function teamName(game: PickGame, team: 'home' | 'away') {
    return team === 'home' ? game.home : game.away;
  }

  function handleWeight(game: PickGame, code: WeightCode) {
    if (code !== 'A') {
      board.setWeight(game.id, code);
      return;
    }
    const intent = board.allInIntentFor(game.id);
    if (intent.kind === 'blocked') return; // chip is disabled; defensive no-op
    if (intent.kind === 'confirm') {
      Alert.alert('Confirm All-In?', 'That’s 10 points riding on one game.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm All-In', onPress: () => board.setWeight(game.id, 'A') }
      ]);
      return;
    }
    const heldName = teamName(intent.from.game, intent.from.team);
    const stagedTeam =
      board.entries[game.id]?.selected?.team ?? board.entries[game.id]?.lockedPick?.team;
    const thisName = stagedTeam ? teamName(game, stagedTeam) : `${game.away} @ ${game.home}`;
    Alert.alert(
      'Move All-In?',
      `Move All-In from ${heldName} to ${thisName}? ${heldName}’s pick will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move All-In',
          onPress: () => {
            void board.moveAllIn(intent.from, game.id).then((result) => {
              if (!result.ok) {
                Alert.alert('Couldn’t move All-In', result.reason ?? 'Try again.');
              }
            });
          }
        }
      ]
    );
  }

  function handleClear(game: PickGame) {
    void board.removePick(game.id).then((result) => {
      if (!result.ok) {
        Alert.alert('Couldn’t clear pick', result.reason ?? 'Try again.');
      }
    });
  }

  const refreshing =
    games.isRefetching ||
    myPicks.isRefetching ||
    groupPicks.isRefetching ||
    settlements.isRefetching;
  const onRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['active-week'] });
    void queryClient.invalidateQueries({ queryKey: ['group-config'] });
    void queryClient.invalidateQueries({ queryKey: ['week-games'] });
    void queryClient.invalidateQueries({ queryKey: ['my-picks'] });
    void queryClient.invalidateQueries({ queryKey: ['group-picks'] });
    void queryClient.invalidateQueries({ queryKey: ['my-settlements'] });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={gameList}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.text }]}>Week {week.weekNumber}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {week.seasonYear} · {groupName}
              </Text>
            </View>
            {week.isLastWeek && FINAL_WEEK_UNLIMITED_ALLIN && (
              <Text style={[styles.finalWeekNote, { color: theme.push }]}>
                Final week — unlimited All-Ins.
              </Text>
            )}
            <PicksSummary games={gameList} entries={board.entries} now={now} />
          </View>
        }
        ListEmptyComponent={
          <CenteredMessage
            title="No games this week"
            detail="Games appear once the schedule and lines are synced."
          />
        }
        renderItem={({ item: game }) => {
          const intent = allInIntent(
            game.id,
            gameList,
            board.entries,
            week.isLastWeek,
            FINAL_WEEK_UNLIMITED_ALLIN
          );
          const blockedBy =
            intent.kind === 'blocked' ? teamName(intent.from.game, intent.from.team) : null;
          return (
            <GameCard
              game={game}
              entry={board.entries[game.id] ?? {}}
              started={kickoffPassed(game.kickoff, now)}
              allInBlockedBy={blockedBy}
              groupPicks={groupPicksByGame.get(game.id) ?? []}
              settlement={settlements.data?.[game.id]}
              myUserId={userId ?? ''}
              onSelectTeam={(team) => board.selectTeam(game.id, team)}
              onSelectWeight={(code) => handleWeight(game, code)}
              onClear={() => handleClear(game)}
              onRetry={() => board.retrySave(game.id)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  list: {
    padding: 16,
    paddingBottom: 32
  },
  header: {
    gap: 10,
    marginBottom: 12
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
    fontWeight: '600'
  },
  finalWeekNote: {
    fontSize: 12,
    fontWeight: '600'
  },
  separator: {
    height: 12
  }
});
