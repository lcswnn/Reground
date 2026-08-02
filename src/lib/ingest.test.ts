import { describe, expect, it } from 'vitest';

import { ingestDayStart, isIngestFresh, isNewlyIngested } from '@/lib/ingest';
import type { Story } from '@/types/database';

function story(overrides: Partial<Story>): Story {
  return {
    id: 'a',
    title: 'Title',
    summary: 'Summary',
    body: null,
    category: 'health',
    image_url: null,
    source_name: 'Source',
    source_url: 'https://example.invalid/a',
    published_at: '2026-07-30T06:00:00.000Z',
    featured_date: null,
    metric_id: null,
    created_at: '2026-07-31T09:00:00.000Z',
    ...overrides,
  };
}

describe('isIngestFresh', () => {
  const at = '2026-07-31T09:00:00.000Z';

  it('is fresh within the window', () => {
    expect(isIngestFresh(at, Date.parse('2026-08-01T08:00:00.000Z'))).toBe(true);
  });

  it('is stale past it', () => {
    expect(isIngestFresh(at, Date.parse('2026-08-02T09:00:00.000Z'))).toBe(false);
  });

  it('is stale exactly at the boundary', () => {
    expect(isIngestFresh(at, Date.parse('2026-08-01T21:00:00.000Z'))).toBe(false);
  });

  it('does not treat a future timestamp as fresh', () => {
    // Clock skew on the device, or a row written with a future `created_at`.
    // Calling that "today's news" would put a sign-off promising tomorrow's
    // batch under a batch that has not happened.
    expect(isIngestFresh(at, Date.parse('2026-07-30T09:00:00.000Z'))).toBe(false);
  });

  it('is false for an unparseable timestamp', () => {
    expect(isIngestFresh('not a date')).toBe(false);
  });
});

describe('ingestDayStart', () => {
  it('floors to UTC midnight', () => {
    expect(ingestDayStart('2026-07-31T09:46:05.855063Z')).toBe('2026-07-31T00:00:00.000Z');
  });

  it('groups a manual re-run with the morning cron', () => {
    // The case this function exists for: a second `news:refresh` the same day
    // writes a new `created_at`, and keying the batch on equality would hide
    // the morning's stories behind the re-run's three.
    expect(ingestDayStart('2026-07-31T22:15:00.000Z')).toBe(
      ingestDayStart('2026-07-31T06:00:00.000Z'),
    );
  });

  it('keeps consecutive days apart', () => {
    expect(ingestDayStart('2026-08-01T06:00:00.000Z')).not.toBe(
      ingestDayStart('2026-07-31T06:00:00.000Z'),
    );
  });

  it('reads a timestamptz with a positive offset as its UTC day', () => {
    // Supabase returns `+00:00`-style offsets, and a run at 23:30 in a +02:00
    // zone belongs to the UTC day the cron ran on, not the local one.
    expect(ingestDayStart('2026-08-01T01:30:00+02:00')).toBe('2026-07-31T00:00:00.000Z');
  });
});

describe('isNewlyIngested', () => {
  const latest = '2026-07-31T09:00:00.000Z';
  // Pinned rather than left to the wall clock: freshness is measured against
  // `now`, so a real clock makes "tags a story from the latest run" pass on the
  // day it was written and fail every day after.
  const now = Date.parse('2026-07-31T12:00:00.000Z');

  it('tags a story from the latest run', () => {
    expect(isNewlyIngested(story({ created_at: latest }), latest, now)).toBe(true);
  });

  it('does not tag one from an earlier run', () => {
    expect(isNewlyIngested(story({ created_at: '2026-07-30T09:00:00.000Z' }), latest, now)).toBe(
      false,
    );
  });

  it('does not tag anything when nothing has ever run', () => {
    expect(isNewlyIngested(story({}), null, now)).toBe(false);
  });

  it('stops tagging once the run itself has gone stale', () => {
    const old = '2020-01-01T00:00:00.000Z';
    expect(isNewlyIngested(story({ created_at: old }), old, now)).toBe(false);
  });
});
