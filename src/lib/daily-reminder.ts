import "expo-sqlite/localStorage/install";

import * as Notifications from "expo-notifications";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState, Linking, Platform } from "react-native";

import type { NotificationPermission } from "@/lib/notification-ask";

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

const STORAGE_KEY = "humanitas.daily-reminder";

/**
 * Android needs a channel before anything can be delivered, and one created
 * lazily at schedule time is fine — the channel's settings are the user's to
 * change afterwards, so it is created once and then left alone.
 */
const CHANNEL_ID = "daily-card";

/**
 * What the reminder actually says.
 *
 * Its own constant rather than an object literal inside `applyReminder`, so the
 * wording is one thing in one place — the copy is the whole user-visible
 * surface of this feature and it should be editable without reading the
 * scheduling logic around it.
 */
const REMINDER_CONTENT = {
  // Names the app rather than one of its screens. This used to say "your card
  // is ready", which was true when the card was the only thing a morning
  // brought — the feed now lands a batch of stories at the same time, and a
  // reminder that mentions only half of what is waiting sends readers to the
  // wrong tab.
  title: "Today’s Collection is Ready",
  // Says there is something to see without saying what — see the note at the
  // top of the file on why the body cannot name today's indicator.
  body: "Tap to read about the good that has been going on in the world.",
};

/** Morning, before the day has had a chance to be bad news. */
export const DEFAULT_HOUR = 8;
export const DEFAULT_MINUTE = 0;

export interface ReminderPreference {
  enabled: boolean;
  /** Local 24-hour clock. The trigger fires when the wall clock matches. */
  hour: number;
  minute: number;
  /**
   * Whether the reader has said "not now" to the in-app offer.
   *
   * Persisted, and never cleared by the app. iOS gives one system prompt per
   * install, so an offer that reappears is spending a finite resource against
   * somebody who has already answered — and the reliable outcome of nagging is
   * notifications disabled at the OS level, which nothing in here can undo.
   */
  askDismissed: boolean;
}

export const DEFAULT_PREFERENCE: ReminderPreference = {
  // Off until asked for. A notification permission prompt on first launch, for a
  // feature the user has not seen yet, is how an app gets permanently denied.
  enabled: false,
  hour: DEFAULT_HOUR,
  minute: DEFAULT_MINUTE,
  askDismissed: false,
};

/**
 * `8:00 am`, in the reader's own locale.
 *
 * Takes only the clock fields so it can format an uncommitted draft as well as
 * the stored preference — Settings needs to label a time that is being chosen
 * and has not been saved.
 */
export function formatReminderTime(
  preference: Pick<ReminderPreference, "hour" | "minute">,
): string {
  const at = new Date();
  at.setHours(preference.hour, preference.minute, 0, 0);
  return at.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Notifications are unavailable on web and in some simulators, and this whole
 * module is a nicety — nothing it does should be able to fail a render or reject
 * a promise into a screen.
 */
const isSupported = Platform.OS === "ios" || Platform.OS === "android";

// --- Preference store --------------------------------------------------------

let preference: ReminderPreference | null = null;
const listeners = new Set<() => void>();

function read(): ReminderPreference {
  if (preference) return preference;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    preference =
      parsed && typeof parsed === "object"
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
export async function applyReminder(
  next: ReminderPreference,
): Promise<ReminderPreference> {
  if (!isSupported) return { ...next, enabled: false };

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!next.enabled) return next;

    const granted = await ensurePermission();
    if (!granted) return { ...next, enabled: false };

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Daily card",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: REMINDER_CONTENT,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: next.hour,
        minute: next.minute,
        // On the trigger, not the content — Android drops a notification whose
        // channel it can't resolve, and iOS ignores the field.
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : null),
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

/**
 * The OS's answer, polled rather than stored.
 *
 * Never persisted: the reader can change it in system settings while the app is
 * closed, so a remembered copy is a lie waiting to be told. Re-read on every
 * foreground, which is exactly when it can have changed — including the return
 * trip from the Settings screen `openNotificationSettings` sends them to.
 */
export function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] =
    useState<NotificationPermission>("undetermined");

  useEffect(() => {
    if (!isSupported) return;

    let active = true;

    async function check(): Promise<void> {
      try {
        const current = await Notifications.getPermissionsAsync();
        if (!active) return;
        // `canAskAgain` is what separates "not asked yet" from "asked and
        // refused". Both are ungranted, and treating them the same would either
        // offer a prompt that cannot appear or send a first-time reader to a
        // settings screen about a decision they have never made.
        setPermission(
          current.granted
            ? "granted"
            : current.canAskAgain
              ? "undetermined"
              : "denied",
        );
      } catch {
        // Simulator without notification support. Undetermined is the honest
        // answer and the harmless one — it offers, and the offer no-ops.
        if (active) setPermission("undetermined");
      }
    }

    void check();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return permission;
}

/** Opens this app's page in the OS settings, the only route back from a denial. */
export function openNotificationSettings(): void {
  void Linking.openSettings();
}

/** Records "not now". Permanent — see `askDismissed`. */
export function dismissReminderAsk(): void {
  write({ ...read(), askDismissed: true });
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
  const current = useSyncExternalStore(
    subscribe,
    getReminderPreference,
    getReminderPreference,
  );

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
