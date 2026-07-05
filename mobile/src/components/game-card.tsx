// One game's card on the picks board — mobile port of GameCard.svelte (+ its
// LockControls and RevealedGroupPicks children). Presentational: all board state
// changes flow through the callbacks the screen wires to usePicksBoard.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TeamSelect } from '@/components/team-select';
import { UserAvatar } from '@/components/user-avatar';
import { WeightSelect } from '@/components/weight-select';
import { formatKickoff, formatSignedPoints } from '@/domain/format';
import { weightLabel, weightPoints } from '@/domain/scoring';
import { signedSpreadForTeam, spreadLine } from '@/domain/spread';
import type {
  GroupPickEntry,
  PickEntry,
  PickGame,
  Settlement,
  TeamSide,
  WeightCode
} from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export type GameCardProps = {
  game: PickGame;
  entry: PickEntry;
  started: boolean;
  /** Disables just the All-In chip (another game's All-In already kicked off). */
  allInBlockedBy: string | null;
  groupPicks: GroupPickEntry[];
  settlement: Settlement | undefined;
  myUserId: string;
  onSelectTeam: (team: TeamSide) => void;
  onSelectWeight: (weight: WeightCode) => void;
  onClear: () => void;
  onRetry: () => void;
};

export function GameCard({
  game,
  entry,
  started,
  allInBlockedBy,
  groupPicks,
  settlement,
  myUserId,
  onSelectTeam,
  onSelectWeight,
  onClear,
  onRetry
}: GameCardProps) {
  const theme = useTheme();

  const current = entry.selected ?? entry.lockedPick;
  const locked = !!entry.lockedPick;
  const canChange = !started && !locked;
  const needsWeight = canChange && !!current?.team && !current?.weight;
  const hasPick = !!entry.selected?.team || !!entry.selected?.weight || locked;
  const missed = started && !locked;

  const statusText =
    game.status === 'final' ? 'Final' : game.status === 'in_progress' ? 'Live' : null;

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      {/* Header: matchup + line + kickoff/status */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.matchup, { color: theme.text }]} numberOfLines={1}>
            {game.away} @ {game.home}
          </Text>
          <Text style={[styles.line, { color: theme.textSecondary }]} numberOfLines={1}>
            {spreadLine(game)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {statusText ? (
            <Text
              style={[
                styles.status,
                { color: game.status === 'in_progress' ? theme.push : theme.textSecondary }
              ]}
            >
              {statusText}
            </Text>
          ) : (
            <Text style={[styles.kickoff, { color: theme.textSecondary }]}>
              {formatKickoff(game.kickoff)}
            </Text>
          )}
          {game.finalScores && (
            <Text style={[styles.score, { color: theme.text }]}>
              {game.finalScores.away}–{game.finalScores.home}
            </Text>
          )}
        </View>
      </View>

      {/* Saved pick summary / settlement */}
      {locked && entry.lockedPick && (
        <View style={styles.lockedRow}>
          <Text style={[styles.lockedText, { color: theme.text }]}>
            Locked: {entry.lockedPick.team === 'home' ? game.home : game.away}
            {signedSpreadForTeam(game, entry.lockedPick.team)} @{' '}
            {weightLabel(entry.lockedPick.weight)} ({weightPoints(entry.lockedPick.weight)})
          </Text>
          {settlement?.outcome && (
            <OutcomeChip outcome={settlement.outcome} points={settlement.pointsDelta} />
          )}
        </View>
      )}
      {missed && (
        <View style={styles.lockedRow}>
          <Text style={[styles.lockedText, { color: theme.loss }]}>No pick</Text>
          {settlement?.outcome && (
            <OutcomeChip outcome={settlement.outcome} points={settlement.pointsDelta} />
          )}
        </View>
      )}

      {/* Selection controls (pre-kickoff) */}
      {!started && (
        <View style={styles.controls}>
          <TeamSelect
            game={game}
            selectedTeam={current?.team}
            canChange={canChange}
            onSelect={onSelectTeam}
          />
          <WeightSelect
            selectedWeight={current?.weight}
            canChange={canChange}
            allInBlocked={!!allInBlockedBy}
            onSelect={onSelectWeight}
          />
          {needsWeight && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Choose a weight to save.
            </Text>
          )}
          {allInBlockedBy != null && canChange && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              All-In is locked on {allInBlockedBy} (already kicked off).
            </Text>
          )}

          {/* Save state + clear (mirror of LockControls.svelte) */}
          <View style={styles.saveRow}>
            <View style={styles.saveStatus}>
              {entry.saveState === 'saving' && (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>Saving…</Text>
              )}
              {entry.saveState === 'error' && (
                <Pressable onPress={onRetry} accessibilityRole="button">
                  <Text style={[styles.hint, { color: theme.loss }]}>
                    {entry.saveError ?? 'Couldn’t save'} — <Text style={styles.retry}>Retry</Text>
                  </Text>
                </Pressable>
              )}
              {!entry.saveState && entry.saveError && (
                <Text style={[styles.hint, { color: theme.push }]}>{entry.saveError}</Text>
              )}
            </View>
            {hasPick && (
              <Pressable onPress={onClear} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.clear, { color: theme.textSecondary }]}>Clear pick</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {started && !locked && !settlement?.outcome && (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Kickoff passed — picks locked.
        </Text>
      )}

      {/* Revealed group picks (after kickoff) */}
      {started && groupPicks.length > 0 && (
        <RevealedGroupPicks picks={groupPicks} myUserId={myUserId} />
      )}
    </View>
  );
}

function OutcomeChip({ outcome, points }: { outcome: string; points: number | null }) {
  const theme = useTheme();
  const color = outcome === 'win' ? theme.win : outcome === 'push' ? theme.push : theme.loss;
  return (
    <View style={[styles.outcomeChip, { borderColor: color }]}>
      <Text style={[styles.outcomeText, { color }]}>
        {outcome.toUpperCase()}
        {points != null ? ` ${formatSignedPoints(points)}` : ''}
      </Text>
    </View>
  );
}

function RevealedGroupPicks({ picks, myUserId }: { picks: GroupPickEntry[]; myUserId: string }) {
  const theme = useTheme();

  // Within a team: the current user first, then heaviest weight, then name.
  const sortMembers = (a: GroupPickEntry, b: GroupPickEntry) => {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    const byWeight =
      (b.weight ? weightPoints(b.weight) : 0) - (a.weight ? weightPoints(a.weight) : 0);
    if (byWeight !== 0) return byWeight;
    return (a.displayName ?? '').localeCompare(b.displayName ?? '');
  };
  const sideRank = (side: GroupPickEntry['pickedSide']) =>
    side === 'away' ? 0 : side === 'home' ? 1 : 2;

  const groups = new Map<
    string,
    { side: GroupPickEntry['pickedSide']; members: GroupPickEntry[] }
  >();
  for (const p of picks) {
    const key = p.pickedTeamShort ?? p.pickedSide ?? p.userId;
    const group = groups.get(key) ?? { side: p.pickedSide, members: [] };
    group.members.push(p);
    groups.set(key, group);
  }
  const teams = [...groups.entries()]
    .map(([label, g]) => ({ label, ...g, members: [...g.members].sort(sortMembers) }))
    .sort((a, b) => sideRank(a.side) - sideRank(b.side));

  return (
    <View style={[styles.groupPicks, { borderTopColor: theme.border }]}>
      <Text style={[styles.groupPicksTitle, { color: theme.textSecondary }]}>GROUP PICKS</Text>
      {teams.map((team) => (
        <View key={team.label} style={styles.teamRow}>
          <Text style={[styles.teamLabel, { color: theme.text }]}>{team.label}</Text>
          <View style={styles.memberList}>
            {team.members.map((p) => {
              const isMe = p.userId === myUserId;
              return (
                <View key={p.userId} style={styles.memberChip}>
                  <UserAvatar size="sm" avatarKey={p.avatarKey} displayName={p.displayName} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.memberName,
                      { color: isMe ? theme.text : theme.textSecondary },
                      isMe && styles.memberNameMe
                    ]}
                  >
                    {p.displayName ?? p.userId}
                    {isMe ? ' (you)' : ''}
                  </Text>
                  <View style={[styles.weightBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <Text style={[styles.weightBadgeText, { color: theme.textSecondary }]}>
                      {p.weight ?? '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  headerLeft: {
    flexShrink: 1,
    gap: 1
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 1
  },
  matchup: {
    fontSize: 16,
    fontWeight: '700'
  },
  line: {
    fontSize: 12,
    fontWeight: '600'
  },
  kickoff: {
    fontSize: 12
  },
  status: {
    fontSize: 12,
    fontWeight: '700'
  },
  score: {
    fontSize: 15,
    fontWeight: '700'
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1
  },
  outcomeChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  controls: {
    gap: 8
  },
  hint: {
    fontSize: 12
  },
  retry: {
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
    gap: 8
  },
  saveStatus: {
    flexShrink: 1
  },
  clear: {
    fontSize: 12,
    textDecorationLine: 'underline'
  },
  groupPicks: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 6
  },
  groupPicksTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6
  },
  teamRow: {
    flexDirection: 'row',
    gap: 8
  },
  teamLabel: {
    width: 40,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4
  },
  memberList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  memberName: {
    fontSize: 12,
    maxWidth: 120
  },
  memberNameMe: {
    fontWeight: '700'
  },
  weightBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  weightBadgeText: {
    fontSize: 10,
    fontWeight: '600'
  }
});
