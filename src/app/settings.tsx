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
import {
  formatReminderTime,
  openNotificationSettings,
  useDailyReminder,
  useNotificationPermission,
} from '@/lib/daily-reminder';
import { isBlockedBySystem } from '@/lib/notification-ask';
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
  const permission = useNotificationPermission();
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * The time being edited, or null when there is no unsaved change.
   *
   * Mirrors the birthday field above rather than writing on every turn of the
   * wheel: the iOS picker fires `onValueChange` continuously as it spins, so
   * committing there rescheduled the notification dozens of times per drag and
   * left whatever value the finger happened to lift on. A draft plus an
   * explicit Save means the wheel is somewhere to think and the reminder only
   * moves once, when asked.
   */
  const [draft, setDraft] = useState<{ hour: number; minute: number } | null>(null);

  if (!reminder.isSupported) return null;

  const blocked = isBlockedBySystem({ isSupported: reminder.isSupported, permission });

  const shown = draft ?? { hour: reminder.hour, minute: reminder.minute };
  const isChanged = draft !== null && (draft.hour !== reminder.hour || draft.minute !== reminder.minute);

  // The picker wants a Date; only its clock fields are read back out.
  const at = new Date();
  at.setHours(shown.hour, shown.minute, 0, 0);

  function closePicker() {
    setPickerOpen(false);
    // Discards an uncommitted change, which is what closing without saving
    // should mean — leaving it would make the row show a time that is not the
    // one scheduled.
    setDraft(null);
  }

  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textMuted">
        Daily reminder
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="defaultSemiBold">Remind me</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              One nudge a day, at the same time, when the day&rsquo;s stories and
              your card are ready.
            </ThemedText>
          </View>

          <Switch
            value={reminder.enabled}
            onValueChange={reminder.setEnabled}
            accessibilityLabel="Daily reminder"
            // A switch that cannot go on should not invite the attempt. The row
            // below explains why and offers the only thing that can fix it.
            disabled={blocked}
            trackColor={{ true: theme.brand, false: theme.backgroundSelected }}
            ios_backgroundColor={theme.backgroundSelected}
          />
        </View>

        {/* The state the old version handled by silently flipping the switch
            back, which reads as a bug. Notifications are refused at the OS
            level, so nothing in this app can turn them on — but it can say so,
            and it can open the one screen that can. */}
        {blocked ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Notifications are turned off for Humanitas in your device settings.
            </ThemedText>
            <Button
              title="Open Settings"
              variant="secondary"
              onPress={openNotificationSettings}
            />
          </>
        ) : reminder.enabled ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reminder time: ${reminder.timeLabel}`}
              accessibilityState={{ expanded: pickerOpen }}
              onPress={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
              style={[
                styles.timeRow,
                { borderColor: pickerOpen ? theme.brand : theme.border },
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Time
              </ThemedText>
              <ThemedText type="defaultSemiBold">
                {isChanged ? formatReminderTime(shown) : reminder.timeLabel}
              </ThemedText>
            </Pressable>

            {pickerOpen ? (
              <>
                <View style={Platform.OS === 'ios' ? styles.pickerInline : undefined}>
                  <DateTimePicker
                    value={at}
                    mode="time"
                    accentColor={theme.brand}
                    onValueChange={(_event, date) => {
                      setDraft({ hour: date.getHours(), minute: date.getMinutes() });
                    }}
                    onDismiss={closePicker}
                  />
                </View>

                <Button
                  title={isChanged ? 'Save time' : 'Saved'}
                  variant={isChanged ? 'primary' : 'secondary'}
                  disabled={!isChanged}
                  onPress={() => {
                    if (!draft) return;
                    reminder.setTime(draft.hour, draft.minute);
                    // Collapse on save, so the wheel standing over a value that
                    // is already committed cannot read as the save not landing.
                    closePicker();
                  }}
                />
              </>
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
