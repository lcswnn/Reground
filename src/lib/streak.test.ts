import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EMPTY_STREAK,
  isSeenOn,
  recordReaction,
  recordSeen,
  visibleStreak,
  type StreakState,
} from '@/lib/streak';

// Same as `fresh-data.test.ts`: the module pulls in the SQLite-backed
// localStorage polyfill for its side effect, and there is no SQLite here. What
// is under test is the streak rule, not the storage engine.
vi.mock('expo-sqlite/localStorage/install', () => ({}));

const store = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

type Streak = typeof import('./streak');

/** A fresh module instance, since the streak is module-level state. */
async function relaunch(): Promise<Streak> {
  vi.resetModules();
  return import('./streak');
}

beforeEach(() => {
  store.clear();
});

/** Walks the reducer across a run of dates, the way a run of days would. */
function seeAll(dates: string[], from: StreakState = EMPTY_STREAK): StreakState {
  return dates.reduce(recordSeen, from);
}

describe('recordSeen', () => {
  it('starts a streak at one', () => {
    expect(recordSeen(EMPTY_STREAK, '2026-07-29').current).toBe(1);
  });

  it('counts consecutive days', () => {
    const state = seeAll(['2026-07-27', '2026-07-28', '2026-07-29']);
    expect(state.current).toBe(3);
    expect(state.total).toBe(3);
  });

  it('is idempotent within a day', () => {
    // The card mounts on every visit to Today, so this runs many times a day.
    const once = recordSeen(EMPTY_STREAK, '2026-07-29');
    const twice = recordSeen(once, '2026-07-29');

    expect(twice).toBe(once);
    expect(twice.total).toBe(1);
  });

  it('resets to one after a missed day, not to zero', () => {
    const state = seeAll(['2026-07-27', '2026-07-28', '2026-07-31']);
    expect(state.current).toBe(1);
    // The day just recorded is day one of the next streak, and the history of
    // days seen has to survive the break.
    expect(state.total).toBe(3);
  });

  it('remembers the longest run through a break', () => {
    const state = seeAll(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-10']);
    expect(state.current).toBe(1);
    expect(state.longest).toBe(3);
  });

  it('counts across a month boundary', () => {
    expect(seeAll(['2026-07-31', '2026-08-01']).current).toBe(2);
  });

  it('counts across a spring-forward boundary', () => {
    // 2026-03-08 is a 23-hour day in the US. Off a raw millisecond division this
    // gap floors to zero days and the streak stalls.
    expect(seeAll(['2026-03-07', '2026-03-08', '2026-03-09']).current).toBe(3);
  });

  it('counts across a leap day', () => {
    expect(seeAll(['2028-02-28', '2028-02-29', '2028-03-01']).current).toBe(3);
  });

  it('ignores a date already behind the last one', () => {
    // A clock that moved backwards, or a stale card recorded late. Rewriting the
    // streak from an earlier date would drop days that were genuinely seen.
    const state = seeAll(['2026-07-28', '2026-07-29']);
    expect(recordSeen(state, '2026-07-27')).toBe(state);
  });

  it('drops the previous day’s reaction', () => {
    const yesterday = recordReaction(EMPTY_STREAK, '2026-07-28', 'hope');
    expect(recordSeen(yesterday, '2026-07-29').lastReaction).toBeNull();
  });
});

describe('recordReaction', () => {
  it('counts the day even if the view was not recorded first', () => {
    const state = recordReaction(EMPTY_STREAK, '2026-07-29', 'hope');
    expect(state.current).toBe(1);
    expect(isSeenOn(state, '2026-07-29')).toBe(true);
  });

  it('does not double-count a day that was already seen', () => {
    const seen = recordSeen(EMPTY_STREAK, '2026-07-29');
    const reacted = recordReaction(seen, '2026-07-29', 'surprised');

    expect(reacted.total).toBe(1);
    expect(reacted.current).toBe(1);
    expect(reacted.lastReaction).toBe('surprised');
  });

  it('lets the reader change their mind', () => {
    const first = recordReaction(EMPTY_STREAK, '2026-07-29', 'hope');
    expect(recordReaction(first, '2026-07-29', 'surprised').lastReaction).toBe('surprised');
  });
});

describe('visibleStreak', () => {
  it('shows the streak on the day it was extended', () => {
    const state = seeAll(['2026-07-28', '2026-07-29']);
    expect(visibleStreak(state, '2026-07-29')).toBe(2);
  });

  it('keeps yesterday’s streak alive through today', () => {
    // Still actionable: opening the app today extends it. Zeroing it before the
    // day is out would tell the user they had already lost something they
    // hadn't.
    const state = seeAll(['2026-07-27', '2026-07-28']);
    expect(visibleStreak(state, '2026-07-29')).toBe(2);
  });

  it('zeroes a streak that has actually lapsed', () => {
    const state = seeAll(['2026-07-20', '2026-07-21', '2026-07-22']);
    // Stored `current` is still 3, but three days ago is history, not a streak.
    expect(state.current).toBe(3);
    expect(visibleStreak(state, '2026-07-29')).toBe(0);
  });

  it('is zero before anything has been seen', () => {
    expect(visibleStreak(EMPTY_STREAK, '2026-07-29')).toBe(0);
  });
});

describe('persistence', () => {
  it('survives a relaunch', async () => {
    const first = await relaunch();
    first.markCardSeen('2026-07-28');
    first.reactToCard('hope', '2026-07-29');

    const second = await relaunch();
    expect(second.getStreakState().current).toBe(2);
    expect(second.getStreakState().lastReaction).toBe('hope');
  });

  it('fills in fields a payload written by an older version is missing', async () => {
    store.set('humanitas.daily-streak', JSON.stringify({ lastDate: '2026-07-29', current: 4 }));

    const streak = await relaunch();
    const state = streak.getStreakState();

    expect(state.current).toBe(4);
    // Absent rather than undefined, which would render as "NaN day streak".
    expect(state.longest).toBe(0);
    expect(state.lastReaction).toBeNull();
  });

  it('starts clean on corrupt storage rather than throwing', async () => {
    store.set('humanitas.daily-streak', 'not json');

    const streak = await relaunch();
    expect(streak.getStreakState()).toEqual(EMPTY_STREAK);
  });

  it('holds a stable snapshot identity across a repeat view', async () => {
    const streak = await relaunch();

    // `useSyncExternalStore` re-renders on any changed snapshot reference, and
    // the card records a view on every mount. An identical state that came back
    // as a new object would loop the home screen.
    streak.markCardSeen('2026-07-29');
    const after = streak.getStreakState();
    streak.markCardSeen('2026-07-29');

    expect(streak.getStreakState()).toBe(after);
  });
});
