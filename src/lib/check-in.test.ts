import { beforeEach, describe, expect, it } from 'vitest';

import {
  appendCheckIn,
  MAX_CHECK_INS,
  readCheckIns,
  recordCheckIn,
  type CheckIn,
} from '@/lib/check-in';
import { setScopeUser } from '@/lib/user-scope';

function entry(mood: CheckIn['mood'], at = '2026-08-02T09:00:00.000Z'): CheckIn {
  return { at, mood };
}

describe('appendCheckIn', () => {
  it('keeps the newest entry last', () => {
    const history = [entry(1, '2026-08-01T09:00:00.000Z')];
    expect(appendCheckIn(history, entry(5)).at(-1)).toEqual(entry(5));
  });

  it('does not mutate the history it was given', () => {
    const history = [entry(3)];
    appendCheckIn(history, entry(4));
    expect(history).toHaveLength(1);
  });

  it('trims from the front once past the limit', () => {
    // The oldest entries are the ones to lose: this log exists to answer
    // "how have I been lately", and dropping the newest would defeat that.
    const history = [entry(1), entry(2), entry(3)];
    expect(appendCheckIn(history, entry(4), 3)).toEqual([entry(2), entry(3), entry(4)]);
  });

  it('holds at the limit rather than growing', () => {
    let history: CheckIn[] = [];
    for (let i = 0; i < MAX_CHECK_INS + 10; i += 1) history = appendCheckIn(history, entry(3));
    expect(history).toHaveLength(MAX_CHECK_INS);
  });
});

describe('recordCheckIn', () => {
  beforeEach(() => {
    localStorage.clear();
    setScopeUser('user-1');
  });

  it('round-trips through storage', () => {
    recordCheckIn(4, '2026-08-02T09:00:00.000Z');
    expect(readCheckIns()).toEqual([entry(4)]);
  });

  it('accumulates across calls', () => {
    recordCheckIn(1, '2026-08-01T09:00:00.000Z');
    recordCheckIn(5, '2026-08-02T09:00:00.000Z');
    expect(readCheckIns().map((c) => c.mood)).toEqual([1, 5]);
  });

  it('keeps one user out of another’s log', () => {
    // The whole reason this goes through `user-scope`: a shared device that
    // showed the previous account's mood history would be a real breach of
    // the one genuinely personal thing the app stores.
    recordCheckIn(2);
    setScopeUser('user-2');
    expect(readCheckIns()).toEqual([]);
  });

  it('treats a corrupt value as no history rather than throwing', () => {
    // A half-written row must not break the launch of an app somebody opened
    // precisely because they were having a bad time.
    localStorage.setItem('mellova.check-ins::user-1', '{not json');
    expect(readCheckIns()).toEqual([]);
    expect(() => recordCheckIn(3)).not.toThrow();
  });

  it('drops entries that are not check-ins', () => {
    localStorage.setItem('mellova.check-ins::user-1', JSON.stringify([{ at: 'x' }, entry(3), 7]));
    expect(readCheckIns()).toEqual([entry(3)]);
  });
});
