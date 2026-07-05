// Group tab: the active group's roster, plus a switcher when the user belongs to
// more than one group. Membership management (invites, renames, promotions) stays
// on the web app — those RPCs exist but the flows aren't worth mobile UI yet.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CenteredMessage, CenteredSpinner } from '@/components/centered';
import { UserAvatar } from '@/components/user-avatar';
import { useActiveGroup } from '@/lib/active-group';
import { useGroupMembers } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { useTheme } from '@/hooks/use-theme';

export default function GroupScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const myUserId = session?.user.id ?? null;
  const { memberships, activeGroup, activeGroupId, setActiveGroupId } = useActiveGroup();

  const members = useGroupMembers(activeGroupId);

  if (!memberships || members.isPending) return <CenteredSpinner />;
  if (members.error) {
    return (
      <CenteredMessage
        title="Couldn’t load the group"
        detail={(members.error as Error).message}
        actionLabel="Retry"
        onAction={() => void members.refetch()}
      />
    );
  }

  const onRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['group-members'] });
    void queryClient.invalidateQueries({ queryKey: ['memberships'] });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={members.data ?? []}
        keyExtractor={(m) => m.userId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={members.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.tint}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {activeGroup?.groupName ?? 'Group'}
            </Text>

            {memberships.length > 1 && (
              <View style={styles.switcher}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  YOUR GROUPS
                </Text>
                {memberships.map((m) => {
                  const selected = m.groupId === activeGroupId;
                  return (
                    <Pressable
                      key={m.groupId}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setActiveGroupId(m.groupId)}
                      style={[
                        styles.switchRow,
                        {
                          borderColor: selected ? theme.tint : theme.border,
                          backgroundColor: theme.backgroundElement
                        }
                      ]}
                    >
                      <Text style={[styles.switchName, { color: theme.text }]} numberOfLines={1}>
                        {m.groupName}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={18} color={theme.tint} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              MEMBERS ({members.data?.length ?? 0})
            </Text>
          </View>
        }
        renderItem={({ item: member }) => {
          const isMe = member.userId === myUserId;
          return (
            <View
              style={[
                styles.memberRow,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border }
              ]}
            >
              <UserAvatar size="md" avatarKey={member.avatarKey} displayName={member.displayName} />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                  {member.displayName ?? 'Unnamed player'}
                  {isMe ? ' (you)' : ''}
                </Text>
                <Text style={[styles.memberMeta, { color: theme.textSecondary }]}>
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </Text>
              </View>
              {member.role === 'commissioner' && (
                <View style={[styles.roleBadge, { borderColor: theme.push }]}>
                  <Text style={[styles.roleBadgeText, { color: theme.push }]}>Commissioner</Text>
                </View>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <Text style={[styles.footerNote, { color: theme.textSecondary }]}>
            Invites and group settings are managed on the web app.
          </Text>
        }
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
    gap: 12,
    marginBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: '800'
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6
  },
  switcher: {
    gap: 6
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  switchName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  memberInfo: {
    flex: 1,
    gap: 1
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600'
  },
  memberMeta: {
    fontSize: 12
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  separator: {
    height: 8
  },
  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16
  }
});
