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

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const theme = useTheme();
  const gradients = useGradients();
  const { signUp } = useSession();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setNotice(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email, password, displayName);
      // With "Confirm email" enabled in Supabase, signUp returns no session —
      // the user has to click the emailed link first. Tell them that instead of
      // leaving them on a screen that looks like it did nothing.
      setNotice('Check your inbox to confirm your email, then sign in.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !submitting;

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
              <ThemedText style={styles.mark}>🌱</ThemedText>
              <ThemedText type="hero">Start your streak</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                One verified piece of progress, every single day.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <TextField
                label="Name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder="Ada"
              />
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                onSubmitEditing={() => canSubmit && onSubmit()}
                errorText={error}
              />

              {notice ? (
                <View style={[styles.notice, { backgroundColor: theme.positiveSoft }]}>
                  <ThemedText type="small" style={{ color: theme.positive }}>
                    {notice}
                  </ThemedText>
                </View>
              ) : null}

              <Button
                title="Create account"
                onPress={onSubmit}
                loading={submitting}
                disabled={!canSubmit}
              />

              <View style={styles.footer}>
                <ThemedText type="small" themeColor="textSecondary">
                  Already have an account?
                </ThemedText>
                <Link href="/sign-in" replace>
                  <ThemedText type="linkPrimary">Sign in</ThemedText>
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
  notice: {
    padding: Spacing.three,
    borderRadius: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
