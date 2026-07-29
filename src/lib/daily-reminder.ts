import 'expo-sqlite/localStorage/install';

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

/**
 * The nudge that makes the daily card a habit rather than a page.
 *
 * A *local* scheduled notification, not a push. That is a deliberate choice and
 * not a shortcut: the card's content is derived on the device from an artifact
 * the app already has, so there is nothing for a server to tell it. A push
 * pipeline would mean device tokens, a table to keep them in, a scheduler
 * running in every timezone the app has a user in, and a new way for the whole
 * feature to fail silently — to deliver a reminder the phone can perfectly well
 * set for itself.
 *
 * The trade-off is honest: the body text cannot mention today's specific card,
 * because iOS and Android repeat the same content on a daily trigger and the app
 * may not have been opened since it was scheduled. A reminder that names the
 * wrong indicator is worse than one that names none, so this one says only that
 * there is something to see.
 */

const STORAGE_KEY = 'humanitas.daily-reminder';

/**
 * Android needs a channel before anything can be delivered, and one created
 * lazily at schedule time is fine — the channel's settings are the user's to
 * change afterwards, so it is created once and then left alone.
 */
const CHANNEL_ID = 'daily-card';

/** Morning, before the day has had a chance to be bad news. */
export const DEFAULT_HOUR = 8;
export const DEFAULT_MINUTE = 0;

export interface ReminderPreference {
  enabled: boolean;
  /** Local 24-hour clock. The trigger fires when the wall clock matches. */
  hour: number;
  minute: number;
}

export const DEFAULT_PREFERENCE: ReminderPreference = {
  // Off until asked for. A notification permission prompt on first launch, for a
  // feature the user has not seen yet, is how an app gets permanently denied.
  enabled: false,
  hour: DEFAULT_HOUR,
  minute: DEFAULT_MINUTE,
};

/** `8:00 am`, in the reader's own locale. */
export function formatReminderTime(preference: ReminderPreference): string {
  const at = new Date();
  at.setHours(preference.hour, preference.minute, 0, 0);
  return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Notifications are unavailable on web and in some simulators, and this whole
 * module is a nicety — nothing it does should be able to fail a render or reject
 * a promise into a screen.
 */
const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

// --- Preference store --------------------------------------------------------

let preference: ReminderPreference | null = null;
const listeners = new Set<() => void>();

function read(): ReminderPreference {
  if (preference) return preference;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    preference =
      parsed && typeof parsed === 'object'
        ? { ...DEFAULT_PREFERENCE, ...(parsed as Partial<ReminderPreference>) }
        : DEFAULT_PREFERENCE;
  } catch {
    preference = DEFAULT_PREFERENCE;
  }

  return preference;
}

function write(next: ReminderPreference): void {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The schedule is already set either way; only the memory of it is lost.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getReminderPreference(): ReminderPreference {
  return read();
}

// --- Scheduling -------------------------------------------------------------

/**
 * Makes the OS schedule match the stored preference.
 *
 * Cancels first, unconditionally. Every path into here — enabling, changing the
 * time, a relaunch — has to end with exactly one scheduled reminder, and
 * `scheduleNotificationAsync` adds rather than replaces, so without the cancel a
 * user who nudged the time three times would get three notifications a day.
 *
 * Returns the preference actually in force, which is not always the one passed
 * in: a denied permission comes back disabled, so the settings toggle can flip
 * itself back rather than claiming a reminder that will never arrive.
 */
export async function applyReminder(next: ReminderPreference): Promise<ReminderPreference> {
  if (!isSupported) return { ...next, enabled: false };

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!next.enabled) return next;

    const granted = await ensurePermission();
    if (!granted) return { ...next, enabled: false };

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily card',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Today’s card is ready',
        // Says there is something to see without saying what — see the note at
        // the top of the file on why the body cannot name today's indicator.
        body: 'One number about the world, and where it is heading.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: next.hour,
        minute: next.minute,
        // On the trigger, not the content — Android drops a notification whose
        // channel it can't resolve, and iOS ignores the field.
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
    });

    return next;
  } catch {
    // A simulator without notification support, or a permission race. Reporting
    // the reminder as off is the honest outcome: nothing was scheduled.
    return { ...next, enabled: false };
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  // Asking again after a hard denial is a no-op the OS answers immediately, so
  // this needs no guard of its own — but it does mean the toggle can be retried
  // once the user has changed their mind in system settings.
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

/**
 * Re-asserts the schedule on launch.
 *
 * Needed because the OS schedule and the stored preference can drift apart
 * without the app doing anything wrong: notifications are cleared when the user
 * reinstalls or restores from a backup, and permission can be revoked in system
 * settings while the app is closed. Cheap enough to just do every launch.
 */
export async function resyncReminder(): Promise<void> {
  const current = read();
  if (!current.enabled) return;

  const applied = await applyReminder(current);
  // Permission was revoked while we weren't looking. Record that rather than
  // leaving a toggle on for a reminder that cannot fire.
  if (applied.enabled !== current.enabled) write(applied);
}

export interface DailyReminder extends ReminderPreference {
  /** False on web, where there is nothing to schedule. */
  isSupported: boolean;
  setEnabled: (enabled: boolean) => void;
  setTime: (hour: number, minute: number) => void;
  /** The chosen time, formatted for display. */
  timeLabel: string;
}

export function useDailyReminder(): DailyReminder {
  const current = useSyncExternalStore(subscribe, getReminderPreference, getReminderPreference);

  /**
   * Optimistic: the stored preference moves first so the switch animates under
   * the finger, then the OS call corrects it if permission was refused. The
   * alternative is a switch that hangs for the length of a permission dialog.
   */
  function apply(next: ReminderPreference): void {
    write(next);
    void applyReminder(next).then((applied) => {
      if (applied.enabled !== next.enabled) write(applied);
    });
  }

  return {
    ...current,
    isSupported,
    timeLabel: formatReminderTime(current),
    setEnabled: (enabled) => apply({ ...current, enabled }),
    setTime: (hour, minute) => apply({ ...current, hour, minute }),
  };
}
