import 'expo-sqlite/localStorage/install';

import { useCallback, useSyncExternalStore } from 'react';

import { parseISODate, todayISO } from '@/lib/format';

/**
 * How many days the reader has looked at the daily card.
 *
 * `total` is the number the app shows. `current` and `longest` are still
 * computed and still correct, but nothing renders them any more, and that is
 * the point rather than an oversight: a consecutive-day streak motivates by
 * threatening to break, which is a poor fit for an app whose feed ends by
 * telling you to go outside. `DaysPill` carries the full argument.
 *
 * They are kept because `longest` cannot be derived without `current`, both are
 * covered by the tests below, and a reducer that quietly stops tracking them is
 * harder to bring back than one that tracks them unread. Anything rendering
 * `current` again should read `DaysPill` first.
 *
 * Deliberately device-local rather than a table. There was also a server-side
 * streak — `current_streak` over `story_reads` — counting a different thing:
 * days a *story* was opened. Two numbers both called a streak, disagreeing, was
 * its own problem; that one is gone and this is the only one left.
 *
 * Local also means the streak survives a dead connection, which matters more
 * here than anywhere else in the app: a streak that breaks because the phone was
 * on a train is worse than no streak. The cost is that it does not follow the
 * user to a new device. The pure reducer below is the whole model, so moving it
 * behind a table later is a change of storage, not of behaviour.
 *
 * Mirrors `fresh-data.ts`: a module-level store read synchronously through
 * `useSyncExternalStore`, backed by the SQLite `localStorage` shim, so the home
 * screen renders the right number on its first frame instead of counting up to
 * it after an effect.
 */

const STORAGE_KEY = 'humanitas.daily-streak';

export type ReactionId = 'hope' | 'surprised';

export const REACTIONS: { id: ReactionId; label: string }[] = [
  { id: 'hope', label: 'This gives me hope' },
  { id: 'surprised', label: "Didn't know that" },
];

export interface StreakState {
  /** Local `YYYY-MM-DD` of the most recent day a card was seen. */
  lastDate: string | null;
  /** Consecutive days up to and including `lastDate`. */
  current: number;
  longest: number;
  /** Days seen, ever. Survives a broken streak, which is the point of it. */
  total: number;
  /**
   * The reaction recorded on `lastDate`, if any. One slot rather than a log:
   * what the UI needs is "has today been reacted to", and keeping every
   * reaction forever would be collecting data the app has no use for.
   */
  lastReaction: ReactionId | null;
}

export const EMPTY_STREAK: StreakState = {
  lastDate: null,
  current: 0,
  longest: 0,
  total: 0,
  lastReaction: null,
};

/** Whether `date` is the calendar day right after `previous`. */
function isConsecutive(previous: string, date: string): boolean {
  const gap = parseISODate(date).getTime() - parseISODate(previous).getTime();
  // Compared in whole days off local midnights, so a DST boundary — where the
  // real gap is 23 or 25 hours — still reads as one day.
  return Math.round(gap / 86_400_000) === 1;
}

/**
 * Records that the day's card was seen.
 *
 * Seeing it is what counts, not reacting. The notification's job is to get
 * somebody to open the app and read one number; having done exactly that and
 * then losing the streak for not tapping a button would punish the behaviour the
 * feature is trying to build. The reaction is a way to say something back, and
 * it is recorded, but it is not the toll.
 *
 * Idempotent within a day: the card mounts on every visit to Today, so this runs
 * many times per day and must only ever count the first.
 *
 * A missed day resets to 1 rather than 0 — the day being recorded *is* day one
 * of the next streak.
 */
export function recordSeen(state: StreakState, date: string): StreakState {
  if (state.lastDate === date) return state;

  // Clock moved backwards, or an old card was somehow recorded after a newer
  // one. Leave the streak alone rather than letting it be rewritten by a date
  // that has already been passed.
  if (state.lastDate && state.lastDate > date) return state;

  const current = state.lastDate && isConsecutive(state.lastDate, date) ? state.current + 1 : 1;

  return {
    lastDate: date,
    current,
    longest: Math.max(state.longest, current),
    total: state.total + 1,
    // Belongs to the previous day, so it does not carry over.
    lastReaction: null,
  };
}

/** Records how the reader felt about today's card. Replaces any earlier tap. */
export function recordReaction(
  state: StreakState,
  date: string,
  reaction: ReactionId,
): StreakState {
  // Reacting to a card implies having seen it, and on a cold launch the reaction
  // can land in the same tick as the view. Going through `recordSeen` keeps the
  // two from disagreeing about whether today has been counted.
  const seen = recordSeen(state, date);
  return { ...seen, lastReaction: reaction };
}

/**
 * The number to put on screen.
 *
 * A stored `current` of 7 whose `lastDate` was four days ago is history, not a
 * streak, and showing it would make the counter meaningless. Today and yesterday
 * both count: yesterday's streak is alive until today is over, which is what
 * makes "keep it going" a thing the user can still act on.
 */
export function visibleStreak(state: StreakState, date = todayISO()): number {
  if (!state.lastDate) return 0;
  if (state.lastDate === date) return state.current;
  if (isConsecutive(state.lastDate, date)) return state.current;
  return 0;
}

/** Whether today's card has already been counted. */
export function isSeenOn(state: StreakState, date: string): boolean {
  return state.lastDate === date;
}

// --- Store -------------------------------------------------------------------

let state: StreakState | null = null;
const listeners = new Set<() => void>();

function read(): StreakState {
  if (state) return state;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    state =
      parsed && typeof parsed === 'object'
        ? // Spread over the empty state rather than trusting the parse: a
          // payload written by an older version is missing fields, and a
          // `current` of undefined would render as "NaN day streak".
          { ...EMPTY_STREAK, ...(parsed as Partial<StreakState>) }
        : EMPTY_STREAK;
  } catch {
    // Corrupt JSON, or storage unavailable on web. Starting from zero loses a
    // streak, which is bad — but it is much better than failing a render.
    state = EMPTY_STREAK;
  }

  return state;
}

function write(next: StreakState): void {
  if (next === state) return;

  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The write failed but the session's state is correct, so the streak is
    // right until relaunch. Nothing useful to do about it here.
  }

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStreakState(): StreakState {
  return read();
}

/** Called when the day's card reaches the screen. Safe to call repeatedly. */
export function markCardSeen(date = todayISO()): void {
  write(recordSeen(read(), date));
}

export function reactToCard(reaction: ReactionId, date = todayISO()): void {
  write(recordReaction(read(), date, reaction));
}

export interface DailyStreak {
  /** Days in a row, zeroed out once the streak has actually lapsed. */
  streak: number;
  longest: number;
  total: number;
  /** True once today has been counted. */
  seenToday: boolean;
  /** Today's reaction, or null if the reader hasn't said anything yet. */
  reaction: ReactionId | null;
  react: (reaction: ReactionId) => void;
}

export function useDailyStreak(date = todayISO()): DailyStreak {
  const current = useSyncExternalStore(subscribe, getStreakState, getStreakState);

  const react = useCallback(
    (reaction: ReactionId) => {
      reactToCard(reaction, date);
    },
    [date],
  );

  const seenToday = isSeenOn(current, date);

  return {
    streak: visibleStreak(current, date),
    longest: current.longest,
    total: current.total,
    seenToday,
    // Only ever today's: `lastReaction` belongs to `lastDate`, and surfacing
    // yesterday's tap on today's card would look like the app answered for you.
    reaction: seenToday ? current.lastReaction : null,
    react,
  };
}
