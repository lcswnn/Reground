import { describe, expect, it } from 'vitest';

import { mergeQueue, sessionRow, type SessionRow } from '@/lib/analytics/row';
import type { Category } from '@/content/categories';
import type { SessionState } from '@/session/session-context';

/**
 * These are worth testing for one reason, and it is not that the code is
 * subtle — it is a field-for-field copy. It is that this is the boundary where
 * things leave the phone, and the failure mode of getting it wrong is not a
 * crash or a wrong number on a screen. It is a build that quietly sends
 * something it said it would not, which nobody notices until somebody reads the
 * table.
 *
 * So the assertions below are mostly about *absence*: the row has exactly these
 * keys, and a session that never really happened produces nothing at all.
 */

const CATEGORY: Category = {
  id: 'doomscrolling',
  label: 'Doomscrolling',
  detail: 'The feed got to me',
  group: 'world',
  games: 'calm',
};

function state(over: Partial<SessionState> = {}): SessionState {
  return {
    startedAt: '2026-08-21T19:00:00.000Z',
    category: CATEGORY,
    categoryGroup: 'world',
    gameKind: 'calm',
    topic: null,
    moodBefore: null,
    moodAfter: null,
    reactivationSkipped: false,
    game: null,
    oneMore: null,
    ...over,
  };
}

describe('what a recorded session contains', () => {
  /**
   * The list, written out, because that is the point of the test. A field added
   * to `SessionRow` without a deliberate change here is a field that started
   * being sent without anybody deciding to send it.
   */
  it('sends these fields and no others', () => {
    const row = sessionRow(state(), new Date('2026-08-21T19:12:00.000Z'), '1.0.0');

    expect(row && Object.keys(row).sort()).toEqual(
      [
        'app_version',
        'category_group',
        'category_id',
        'ended_at',
        'game_id',
        'game_kind',
        'mood_after',
        'mood_before',
        'one_more_id',
        'reactivation_skipped',
        'started_at',
        'topic_id',
      ].sort(),
    );
  });

  /**
   * The labels are copy and get rewritten; the ids are the thing a report can
   * be grouped on across releases. Nothing in the row may carry a sentence.
   */
  it('carries ids rather than the words on screen', () => {
    const row = sessionRow(state(), new Date(), null);

    expect(row?.category_id).toBe('doomscrolling');
    expect(JSON.stringify(row)).not.toContain(CATEGORY.label);
    expect(JSON.stringify(row)).not.toContain(CATEGORY.detail);
  });

  it('keeps both ratings, which is the pair the whole thing is for', () => {
    const row = sessionRow(
      state({ moodBefore: 8, moodAfter: 4 }),
      new Date(),
      null,
    );

    expect(row?.mood_before).toBe(8);
    expect(row?.mood_after).toBe(4);
  });

  /**
   * A "No anxiety" session measures nothing — see `measuresMood` — and still
   * gets a row, because what it did is worth knowing even when there is no drop
   * to attribute to it.
   */
  it('still records a session that was never rated', () => {
    const row = sessionRow(state({ oneMore: 'soundscape' }), new Date(), null);

    expect(row).not.toBeNull();
    expect(row?.mood_before).toBeNull();
    expect(row?.one_more_id).toBe('soundscape');
  });
});

describe('what is not recorded at all', () => {
  it('says nothing about a session that never began', () => {
    expect(sessionRow(state({ startedAt: null }), new Date(), null)).toBeNull();
  });

  it('says nothing about somebody who only opened the app', () => {
    expect(sessionRow(state({ category: null }), new Date(), null)).toBeNull();
  });
});

describe('the pending queue', () => {
  const row = (startedAt: string, moodAfter: number | null = null): SessionRow => ({
    started_at: startedAt,
    ended_at: startedAt,
    category_id: 'doomscrolling',
    category_group: 'world',
    game_kind: 'calm',
    topic_id: null,
    game_id: null,
    one_more_id: null,
    mood_before: 7,
    mood_after: moodAfter,
    reactivation_skipped: false,
    app_version: '1.0.0',
  });

  /**
   * The rule the second write depends on. Both writes for one session carry the
   * same `startedAt`, and offline they must collapse — otherwise the queue sends
   * two rows that the database then has to reconcile into one.
   */
  it('keeps one entry per session, and the later one', () => {
    const first = row('a');
    const second = row('a', 3);

    const queued = mergeQueue([first], second, 12);

    expect(queued).toEqual([second]);
  });

  it('leaves other sessions alone', () => {
    const queued = mergeQueue([row('a'), row('b')], row('c'), 12);

    expect(queued.map((entry) => entry.started_at)).toEqual(['a', 'b', 'c']);
  });

  /**
   * Capped, and the oldest is what goes. Somebody using the app offline for a
   * fortnight should lose the front of the fortnight rather than accumulate a
   * file — see the note at the top of `queue.ts`.
   */
  it('drops the oldest rather than growing', () => {
    const queued = mergeQueue([row('a'), row('b'), row('c')], row('d'), 3);

    expect(queued.map((entry) => entry.started_at)).toEqual(['b', 'c', 'd']);
  });
});
