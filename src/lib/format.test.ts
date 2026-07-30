import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatStoryAge } from './format';

// The real timings this has to get right are hours apart, so the clock is
// pinned rather than computed from `Date.now()` at test time.
const NOW = '2026-07-30T17:41:00.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatStoryAge', () => {
  it('dates a late-ingested story by when it arrived', () => {
    // The two stories the 07-30 run actually wrote: published yesterday
    // morning, written to the database at 09:46 today.
    expect(formatStoryAge('2026-07-29T04:48:42+00:00', '2026-07-30T09:46:05.855063+00:00')).toBe(
      'Today',
    );
  });

  it('leaves a story ingested the same day it published alone', () => {
    expect(formatStoryAge('2026-07-30T13:00:30+00:00', '2026-07-30T14:00:00+00:00')).toBe('Today');
  });

  it('still ages a story that has sat in the feed', () => {
    expect(formatStoryAge('2026-07-28T08:00:00+00:00', '2026-07-29T15:49:38+00:00')).toBe(
      'Yesterday',
    );
  });

  it('ignores a created_at that precedes publication', () => {
    // Backfilled by hand. "Arrived before it was written" is not renderable, so
    // the publication date wins.
    expect(formatStoryAge('2026-07-29T12:00:00+00:00', '2026-07-20T00:00:00+00:00')).toBe(
      'Yesterday',
    );
  });

  it('falls back when a timestamp is unparseable', () => {
    expect(formatStoryAge('2026-07-29T12:00:00+00:00', 'not-a-date')).toBe('Yesterday');
  });
});
