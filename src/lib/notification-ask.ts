/**
 * Whether to offer the reader a daily reminder.
 *
 * Split out as pure logic because it is a rule with four inputs and one chance
 * to get right. iOS presents the system notification prompt *once per install*
 * — a denial is permanent and recoverable only by the reader going to Settings
 * themselves — so anything that fires that prompt at a bad moment has spent the
 * app's only ask, forever, on nothing.
 *
 * Which is why this decides whether to show *our* card, not whether to show the
 * system alert. The card explains what the reminder is and what it costs; the
 * system alert is only reached by someone who has already read that and tapped
 * yes. Apple's guidance says to ask in context with an explanation, App Review
 * guideline 4.5.4 requires consent before notifications, and the pattern below
 * satisfies both — but the real reason is that a cold prompt on first launch
 * gets denied, and a denial here cannot be undone.
 */

export type NotificationPermission = 'undetermined' | 'granted' | 'denied';

export interface ReminderAskInput {
  /** False on web, where there is nothing to schedule. */
  isSupported: boolean;
  permission: NotificationPermission;
  /** Whether the reader already has the reminder switched on. */
  reminderEnabled: boolean;
  /** Whether they have already said "not now" to this card. */
  dismissed: boolean;
}

export function shouldOfferReminder({
  isSupported,
  permission,
  reminderEnabled,
  dismissed,
}: ReminderAskInput): boolean {
  if (!isSupported) return false;

  // Already on. Asking somebody to turn on a thing they turned on is how a
  // prompt stops being read at all.
  if (reminderEnabled) return false;

  // They said no. Once, permanently — the switch in Settings is still there for
  // anybody who changes their mind, and that is the whole of the second chance
  // this app gets to have. Re-showing a dismissed card is the behaviour that
  // makes people disable notifications for an app at the OS level.
  if (dismissed) return false;

  // Denied at the system level, so there is no prompt left to fire: tapping the
  // button would do nothing visible and read as a broken control. Settings
  // handles this case, where it can send them to the OS screen that can undo it.
  if (permission === 'denied') return false;

  return true;
}

/**
 * Whether the reminder is switched on but cannot actually deliver.
 *
 * The state Settings has to explain rather than silently correct. A switch that
 * flips itself back with no message reads as a bug, and the reader has no way to
 * learn that the fix is two taps away in the OS.
 */
export function isBlockedBySystem({
  isSupported,
  permission,
}: Pick<ReminderAskInput, 'isSupported' | 'permission'>): boolean {
  return isSupported && permission === 'denied';
}
