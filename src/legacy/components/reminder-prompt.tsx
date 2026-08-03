import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  dismissReminderAsk,
  formatReminderTime,
  useDailyReminder,
  useNotificationPermission,
} from '@/lib/daily-reminder';
import { shouldOfferReminder } from '@/lib/notification-ask';

/**
 * The app asking for notifications, in the app's own words, before the OS asks
 * in Apple's.
 *
 * The ordering is the entire design. iOS presents its permission alert once per
 * install and a refusal is permanent — the reader can only undo it by going to
 * Settings on their own, which essentially nobody does. So the system alert has
 * to be the *second* question, reached only by somebody who has already read
 * what the reminder is and tapped yes. That is what App Review guideline 4.5.4
 * is getting at, it is what Apple's own guidance recommends, and it is also
 * just the difference between a prompt that gets accepted and one that does not.
 *
 * So this card states the whole cost up front: how many notifications, at what
 * time, containing what. Nothing here overstates it, because the system alert
 * immediately afterwards is where an exaggeration would be found out.
 *
 * Lives on Today rather than in front of the app at launch. A permission ask
 * before the reader has seen a single story is asking them to value something
 * they have not been shown, and Apple's guidance is explicit about asking in
 * context. This sits under the greeting, on the screen the reminder is about.
 *
 * "Not now" is permanent, and that is deliberate generosity rather than
 * laziness — see `askDismissed`. The switch in Settings remains for anybody who
 * changes their mind.
 */
export function ReminderPrompt() {
  const theme = useTheme();
  const reminder = useDailyReminder();
  const permission = useNotificationPermission();

  const offer = shouldOfferReminder({
    isSupported: reminder.isSupported,
    permission,
    reminderEnabled: reminder.enabled,
    dismissed: reminder.askDismissed,
  });

  if (!offer) return null;

  return (
    <View style={styles.root}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText type="eyebrow" themeColor="textMuted">
          One a day
        </ThemedText>

        <ThemedText type="sectionTitle">Want a nudge each morning?</ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {/* Concrete, because the system alert lands one tap later and a vague
              promise here would be contradicted by it. Says the count, the
              time, and what is in it. */}
          One notification a day, at {formatReminderTime(reminder)}, when the
          day&rsquo;s stories and your card are ready. No sound, no badge,
          nothing else — and you can change the time or turn it off in Settings.
        </ThemedText>

        <View style={styles.actions}>
          {/* Enabling is what fires the OS prompt: `applyReminder` requests
              permission on its way to scheduling. By this point the reader has
              already agreed, so the system alert is a confirmation rather than
              an interruption. */}
          <Button title="Turn on reminders" onPress={() => reminder.setEnabled(true)} />
          <Button title="Not now" variant="ghost" onPress={dismissReminderAsk} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});
