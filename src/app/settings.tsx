import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { EARLIEST_BIRTHDAY, LATEST_BIRTHDAY } from '@/constants/birthday';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchProfile, updateBirthDate } from '@/api/profile';
import { useDailyReminder } from '@/lib/daily-reminder';
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

  // Owned here rather than inside the field because saving has to close it: a
  // wheel left standing over a value that is already committed reads as the
  // save not having taken.
  const [pickerOpen, setPickerOpen] = useState(false);

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
      // Hand the field back to the query now that the two agree, and collapse
      // the picker so the card returns to its resting state. Only on success —
      // a failed save leaves the wheel up, where the value can be retried.
      setEdited(null);
      setPickerOpen(false);
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

      <DailyReminderSection />

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
              open={pickerOpen}
              onOpenChange={setPickerOpen}
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

/**
 * The daily card's reminder.
 *
 * Its own component rather than more markup in `SettingsScreen`, because the
 * time picker needs open/closed state and the screen above already carries the
 * birthday's — two `pickerOpen` flags in one function is how they end up
 * accidentally sharing one.
 *
 * Hidden entirely where notifications don't exist (web). A switch that cannot do
 * anything is worse than an absent one.
 */
function DailyReminderSection() {
  const theme = useTheme();
  const reminder = useDailyReminder();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!reminder.isSupported) return null;

  // The picker wants a Date; only its clock fields are read back out.
  const at = new Date();
  at.setHours(reminder.hour, reminder.minute, 0, 0);

  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textMuted">
        Daily card
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="defaultSemiBold">Remind me</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              One nudge a day, at the same time, when a new card is waiting.
            </ThemedText>
          </View>

          <Switch
            value={reminder.enabled}
            onValueChange={reminder.setEnabled}
            accessibilityLabel="Daily card reminder"
            trackColor={{ true: theme.brand, false: theme.backgroundSelected }}
            ios_backgroundColor={theme.backgroundSelected}
          />
        </View>

        {reminder.enabled ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reminder time: ${reminder.timeLabel}`}
              accessibilityState={{ expanded: pickerOpen }}
              onPress={() => setPickerOpen((open) => !open)}
              style={[
                styles.timeRow,
                { borderColor: pickerOpen ? theme.brand : theme.border },
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Time
              </ThemedText>
              <ThemedText type="defaultSemiBold">{reminder.timeLabel}</ThemedText>
            </Pressable>

            {pickerOpen ? (
              <View style={Platform.OS === 'ios' ? styles.pickerInline : undefined}>
                <DateTimePicker
                  value={at}
                  mode="time"
                  accentColor={theme.brand}
                  onValueChange={(_event, date) => {
                    reminder.setTime(date.getHours(), date.getMinutes());
                    // iOS keeps the wheel up so the time can be nudged; the
                    // Android dialog has already dismissed itself by here.
                    if (Platform.OS !== 'ios') setPickerOpen(false);
                  }}
                  onDismiss={() => setPickerOpen(false)}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
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
  // Matches `DateField`'s box, so the two pickers in this screen read as one
  // control repeated rather than two designs.
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
  },
  // The iOS wheel has no intrinsic height in a flex container.
  pickerInline: {
    height: 180,
    justifyContent: 'center',
  },
});
