// Profile tab. Read-only: profile edits go through the web app's /api/profile
// endpoint (service-role write — the users table has no client UPDATE grant),
// so the mobile app only displays the profile and handles sign-out.
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CenteredSpinner } from '@/components/centered';
import { UserAvatar } from '@/components/user-avatar';
import { useActiveGroup } from '@/lib/active-group';
import { useMyProfile } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { supabaseHost } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useSession();
  const { memberships } = useActiveGroup();
  const userId = session?.user.id ?? null;
  const profile = useMyProfile(userId);

  if (profile.isPending) return <CenteredSpinner />;

  const displayName = profile.data?.displayName ?? session?.user.email ?? 'Player';

  function onSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() }
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <UserAvatar size="lg" avatarKey={profile.data?.avatarKey} displayName={displayName} />
          <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>
            {session?.user.email ?? ''}
          </Text>
          {profile.data?.role === 'admin' && (
            <View style={[styles.adminBadge, { borderColor: theme.tint }]}>
              <Text style={[styles.adminBadgeText, { color: theme.tint }]}>Admin</Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border }
          ]}
        >
          <InfoRow label="Groups" value={`${memberships?.length ?? 0}`} />
          <InfoRow label="Environment" value={supabaseHost} />
          <InfoRow label="App version" value={Constants.expoConfig?.version ?? 'dev'} />
        </View>

        <Text style={[styles.note, { color: theme.textSecondary }]}>
          Name and avatar changes, notifications, and admin tools live on the web app.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={[styles.signOut, { borderColor: theme.loss }]}
        >
          <Text style={[styles.signOutText, { color: theme.loss }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16
  },
  name: {
    fontSize: 24,
    fontWeight: '800'
  },
  email: {
    fontSize: 14
  },
  adminBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12
  },
  infoLabel: {
    fontSize: 14
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17
  },
  signOut: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center'
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700'
  }
});
