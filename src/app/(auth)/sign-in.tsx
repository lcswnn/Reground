import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGradients } from '@/hooks/use-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

export default function SignInScreen() {
  const theme = useTheme();
  const gradients = useGradients();
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // No navigation needed: Stack.Protected in the root layout swaps the
      // navigator as soon as the session lands.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient colors={gradients.dawn} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <ThemedText style={styles.mark}>🌅</ThemedText>
              <ThemedText type="hero">Welcome back</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Today&rsquo;s proof that things are getting better is waiting.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
                returnKeyType="next"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••••"
                returnKeyType="go"
                onSubmitEditing={() => canSubmit && onSubmit()}
                errorText={error}
              />

              <Button
                title="Sign in"
                onPress={onSubmit}
                loading={submitting}
                disabled={!canSubmit}
              />

              <View style={styles.footer}>
                <ThemedText type="small" themeColor="textSecondary">
                  New here?
                </ThemedText>
                <Link href="/sign-up" replace>
                  <ThemedText type="linkPrimary">Create an account</ThemedText>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    gap: Spacing.two,
  },
  mark: {
    fontSize: 52,
  },
  form: {
    gap: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
