import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { EARLIEST_BIRTHDAY, LATEST_BIRTHDAY } from '@/constants/birthday';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchProfile, updateBirthDate } from '@/api/profile';
import { queryKeys } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useThemePreference } from '@/lib/theme-preference';

export default function SettingsScreen() {
  const theme = useTheme();
  const { session, signOut } = useSession();
  const { isDark, setPreference } = useThemePreference();
  const queryClient = useQueryClient();

  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });

  const storedBirthday = profileQuery.data?.birth_date ?? null;
  // Null means "no unsaved edit", so the field simply falls through to whatever
  // the query holds. Mirroring the query into state instead would need an
  // effect, and that effect would wipe a half-made choice on every refetch.
  const [edited, setEdited] = useState<string | null>(null);

  const birthday = edited ?? storedBirthday;
  const isChanged = edited !== null && edited !== storedBirthday;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your streak and saved stories stay on your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  const saveBirthday = useMutation({
    mutationFn: (next: string) => updateBirthDate(userId as string, next),
    onSuccess: () => {
      // Hand the field back to the query now that the two agree.
      setEdited(null);
      return queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId ?? '') });
    },
  });

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          Appearance
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="defaultSemiBold">Dark mode</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                The same palette at a lower luminance, for reading at night.
              </ThemedText>
            </View>

            <Switch
              value={isDark}
              onValueChange={(next) => setPreference(next ? 'dark' : 'light')}
              accessibilityLabel="Dark mode"
              trackColor={{ true: theme.brand, false: theme.backgroundSelected }}
              // iOS draws its own grey behind the track until the switch is on;
              // without this the off state ignores the palette.
              ios_backgroundColor={theme.backgroundSelected}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          Your birthday
        </ThemedText>

        {profileQuery.isPending ? (
          <LoadingState label="Loading your profile…" />
        ) : profileQuery.error ? (
          <ErrorState error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
        ) : (
          <View
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Used to show you how much has changed in the world since the day you were born.
            </ThemedText>

            <DateField
              label="Birthday"
              value={birthday}
              onChange={setEdited}
              placeholder="When it all started for you"
              minimumDate={EARLIEST_BIRTHDAY}
              maximumDate={LATEST_BIRTHDAY}
              errorText={
                saveBirthday.error instanceof Error ? saveBirthday.error.message : undefined
              }
            />

            <Button
              title={isChanged ? 'Save birthday' : 'Saved'}
              variant={isChanged ? 'primary' : 'secondary'}
              disabled={!isChanged || saveBirthday.isPending}
              loading={saveBirthday.isPending}
              onPress={() => birthday && saveBirthday.mutate(birthday)}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          Account
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Signed in as {session?.user.email ?? 'this device'}.
          </ThemedText>

          <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
