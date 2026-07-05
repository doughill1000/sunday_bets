// Authenticated tab shell. Mirrors the web app's route guards: no session →
// sign-in; a session with no active group membership → join-on-web notice
// (invite redemption stays on the web app).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { CenteredMessage, CenteredSpinner } from '@/components/centered';
import { useActiveGroup } from '@/lib/active-group';
import { useSession } from '@/lib/session';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  const { session, initialized, signOut } = useSession();
  const { memberships, membershipsError } = useActiveGroup();

  if (!initialized) {
    // Splash screen is still covering the app.
    return null;
  }
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (membershipsError) {
    return (
      <CenteredMessage
        title="Couldn’t load your groups"
        detail={membershipsError.message}
        actionLabel="Sign out"
        onAction={() => void signOut()}
      />
    );
  }
  if (!memberships) {
    return <CenteredSpinner />;
  }
  if (memberships.length === 0) {
    return (
      <CenteredMessage
        title="You’re not in a group yet"
        detail="Ask your commissioner for an invite link and redeem it on the web app, then come back here."
        actionLabel="Sign out"
        onAction={() => void signOut()}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Picks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="american-football" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Standings',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: 'Group',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
