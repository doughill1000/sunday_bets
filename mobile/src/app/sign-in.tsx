// Email/password sign-in against the same Supabase Auth the web app uses.
// Sign-up, password reset and Google OAuth stay on the web app (OAuth needs
// deep-link plumbing that isn't worth it for a ~6-player league).
import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const theme = useTheme();
  const { session, initialized } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (initialized && session) {
    return <Redirect href="/" />;
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message ?? 'Sign-in failed');
    }
    // Success: onAuthStateChange updates the session and the redirect above fires.
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View style={styles.hero}>
            <Text style={styles.logo}>🏈</Text>
            <Text style={[styles.title, { color: theme.text }]}>Sunday Bets</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Picks against the spread, with friends.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.backgroundElement
                }
              ]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.backgroundElement
                }
              ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={onSubmit}
            />

            {error && <Text style={[styles.error, { color: theme.loss }]}>{error}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={onSubmit}
              style={[
                styles.button,
                { backgroundColor: theme.tint },
                !canSubmit && styles.buttonDisabled
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Use your existing Sunday Bets account. Sign-up, password resets and Google sign-in
              live on the web app.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32
  },
  hero: {
    alignItems: 'center',
    gap: 4
  },
  logo: {
    fontSize: 56
  },
  title: {
    fontSize: 32,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 14
  },
  form: {
    gap: 12
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  error: {
    fontSize: 13,
    fontWeight: '600'
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8
  }
});
