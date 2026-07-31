import { describe, expect, it } from 'vitest';

import {
  isBlockedBySystem,
  shouldOfferReminder,
  type ReminderAskInput,
} from '@/lib/notification-ask';

function ask(overrides: Partial<ReminderAskInput> = {}): ReminderAskInput {
  return {
    isSupported: true,
    permission: 'undetermined',
    reminderEnabled: false,
    dismissed: false,
    ...overrides,
  };
}

describe('shouldOfferReminder', () => {
  it('offers to a new reader who has not been asked', () => {
    expect(shouldOfferReminder(ask())).toBe(true);
  });

  it('does not offer where notifications do not exist', () => {
    expect(shouldOfferReminder(ask({ isSupported: false }))).toBe(false);
  });

  it('does not offer once the reminder is already on', () => {
    expect(shouldOfferReminder(ask({ reminderEnabled: true, permission: 'granted' }))).toBe(false);
  });

  it('never re-asks after "not now"', () => {
    // The single most important case. Re-showing a dismissed prompt is what
    // makes people turn an app's notifications off at the OS level, which is
    // the one state the app cannot recover from on its own.
    expect(shouldOfferReminder(ask({ dismissed: true }))).toBe(false);
  });

  it('does not offer once the system prompt has been denied', () => {
    // There is no prompt left to fire, so the button would do nothing visible
    // and read as broken. Settings handles this case instead, where it can send
    // the reader somewhere that can actually undo it.
    expect(shouldOfferReminder(ask({ permission: 'denied' }))).toBe(false);
  });

  it('still offers when permission is already granted but the reminder is off', () => {
    // Reinstall, or a reader who turned the reminder off and later cleared the
    // dismissal. Tapping through costs them no system prompt at all.
    expect(shouldOfferReminder(ask({ permission: 'granted' }))).toBe(true);
  });

  it('keeps the dismissal winning over everything else', () => {
    expect(shouldOfferReminder(ask({ dismissed: true, permission: 'granted' }))).toBe(false);
  });
});

describe('isBlockedBySystem', () => {
  it('is true when the OS has been told no', () => {
    expect(isBlockedBySystem({ isSupported: true, permission: 'denied' })).toBe(true);
  });

  it('is false before anybody has been asked', () => {
    // Undetermined is not blocked — the prompt is still available, and telling
    // a reader to go to Settings before they have ever been asked is nonsense.
    expect(isBlockedBySystem({ isSupported: true, permission: 'undetermined' })).toBe(false);
  });

  it('is false when granted', () => {
    expect(isBlockedBySystem({ isSupported: true, permission: 'granted' })).toBe(false);
  });

  it('is false on web, where there is nothing to unblock', () => {
    expect(isBlockedBySystem({ isSupported: false, permission: 'denied' })).toBe(false);
  });
});
