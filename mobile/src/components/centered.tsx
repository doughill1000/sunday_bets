// Shared full-screen loading / error / empty states.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function CenteredSpinner() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.tint} />
    </View>
  );
}

export function CenteredMessage({
  title,
  detail,
  actionLabel,
  onAction
}: {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {detail ? (
        <Text style={[styles.detail, { color: theme.textSecondary }]}>{detail}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[styles.button, { backgroundColor: theme.tint }]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center'
  },
  detail: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  button: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  }
});
