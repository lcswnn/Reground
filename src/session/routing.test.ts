import { describe, expect, it } from 'vitest';

import { HIGH_DISTRESS_MOOD, MEANINGFUL_MOOD_DROP, PUZZLE } from '@/config/session';
import {
  aftercareKind,
  moodOutcome,
  needsTopic,
  previousRoute,
  puzzleDurationMs,
  showsCalibration,
  skipsReactivation,
  type BackContext,
  type SessionRoute,
} from '@/session/routing';

describe('skipsReactivation', () => {
  it('skips the cue at or above the high-distress threshold', () => {
    expect(skipsReactivation(HIGH_DISTRESS_MOOD)).toBe(true);
    expect(skipsReactivation(10)).toBe(true);
  });

  it('shows it below the threshold', () => {
    expect(skipsReactivation(HIGH_DISTRESS_MOOD - 1)).toBe(false);
    expect(skipsReactivation(0)).toBe(false);
  });
});

describe('group routing', () => {
  it('gives witnessed content the longer puzzle', () => {
    expect(puzzleDurationMs('witnessed')).toBe(PUZZLE.witnessedMs);
    expect(puzzleDurationMs('world')).toBe(PUZZLE.standardMs);
    expect(PUZZLE.witnessedMs).toBeGreaterThan(PUZZLE.standardMs);
  });

  it('shows calibration only for world-state fears', () => {
    expect(showsCalibration('world')).toBe(true);
    expect(showsCalibration('witnessed')).toBe(false);
  });

  it('offers grounding for images and postponement for worries', () => {
    expect(aftercareKind('witnessed')).toBe('grounding');
    expect(aftercareKind('world')).toBe('park-worry');
  });

  it('asks the topic follow-up only for world-state fears', () => {
    expect(needsTopic('world')).toBe(true);
    expect(needsTopic('witnessed')).toBe(false);
  });

  // The picker exists to feed the calibration screen. If one group were asked
  // which thing and then never shown anything about it, the question would be
  // taking a tap from someone in distress and giving nothing back for it.
  it('asks for a topic exactly when it will use one', () => {
    expect(needsTopic('world')).toBe(showsCalibration('world'));
    expect(needsTopic('witnessed')).toBe(showsCalibration('witnessed'));
  });
});

describe('previousRoute', () => {
  const context = (over: Partial<BackContext> = {}): BackContext => ({
    group: 'world',
    hasTopic: true,
    moodBefore: 5,
    moodAfter: 5,
    ...over,
  });

  it('gives the door and the dead end no way back', () => {
    expect(previousRoute('/', context())).toBeNull();
    expect(previousRoute('/closed', context())).toBeNull();
  });

  // The only two that are null. A screen added without a target would be a
  // screen the user can be stuck on, so this is the check that catches it.
  it('gives every other screen one', () => {
    const routes: SessionRoute[] = [
      '/category',
      '/topic',
      '/mood',
      '/breathe-intro',
      '/breathe',
      '/reactivate',
      '/games',
      '/game',
      '/calibration',
      '/mood-after',
      '/aftercare',
      '/check-in',
      '/close',
    ];

    routes.forEach((route) => {
      expect(previousRoute(route, context())).not.toBeNull();
    });
  });

  it('returns the rating screen to whichever question was asked last', () => {
    expect(previousRoute('/mood', context({ hasTopic: true }))).toBe('/topic');
    expect(previousRoute('/mood', context({ hasTopic: false }))).toBe('/category');
  });

  /**
   * The cue screen forwards itself at high distress, so a back button pointing
   * at it would land the user there for one frame and then push them straight
   * back — a control that visibly does nothing.
   */
  it('skips the reactivation cue on the way back when it was skipped forward', () => {
    expect(previousRoute('/games', context({ moodBefore: HIGH_DISTRESS_MOOD }))).toBe(
      '/breathe-intro',
    );
    expect(previousRoute('/games', context({ moodBefore: HIGH_DISTRESS_MOOD - 1 }))).toBe(
      '/reactivate',
    );
  });

  // Never `/breathe`: see `previousRoute`. Restarting a minute of guided
  // breathing is a forward move, whatever button asked for it.
  it('returns to the breath intro rather than into the breath', () => {
    expect(previousRoute('/reactivate', context())).toBe('/breathe-intro');
    expect(previousRoute('/breathe', context())).toBe('/breathe-intro');
  });

  // The breath is the first step after the rating now, so its back button is
  // the one that walks out of the session's timed half entirely.
  it('returns the breath intro to the rating', () => {
    expect(previousRoute('/breathe-intro', context({ moodBefore: HIGH_DISTRESS_MOOD }))).toBe(
      '/mood',
    );
    expect(previousRoute('/breathe-intro', context({ moodBefore: 0 }))).toBe('/mood');
  });

  it('routes the second rating past calibration for the group that never saw it', () => {
    expect(previousRoute('/mood-after', context({ group: 'world' }))).toBe('/calibration');
    expect(previousRoute('/mood-after', context({ group: 'witnessed' }))).toBe('/game');
  });

  describe('the closing screen, which has three ways in', () => {
    it('goes back to the rating when the rating is what ended the session', () => {
      const improved = context({ moodBefore: 8, moodAfter: 8 - MEANINGFUL_MOOD_DROP });
      expect(previousRoute('/close', improved)).toBe('/mood-after');
    });

    it('goes back through whichever aftercare step actually ran', () => {
      const stuck = { moodBefore: 6, moodAfter: 6 };
      expect(previousRoute('/close', context({ ...stuck, group: 'witnessed' }))).toBe('/check-in');
      expect(previousRoute('/close', context({ ...stuck, group: 'world' }))).toBe('/aftercare');
    });

    // A reload empties the provider, and a screen with no button is worse than
    // one whose button lands a step early.
    it('falls back to the rating when there is no state to reconstruct from', () => {
      expect(previousRoute('/close', context({ moodAfter: null }))).toBe('/mood-after');
      expect(previousRoute('/close', context({ group: null }))).toBe('/mood-after');
    });
  });
});

describe('moodOutcome', () => {
  it('counts a drop of the threshold or more as improvement', () => {
    expect(moodOutcome(7, 7 - MEANINGFUL_MOOD_DROP).improved).toBe(true);
    expect(moodOutcome(7, 7 - MEANINGFUL_MOOD_DROP + 1).improved).toBe(false);
  });

  it('does not count getting worse as improvement', () => {
    expect(moodOutcome(4, 9).improved).toBe(false);
  });

  it('flags high distress independently of improvement', () => {
    // Improved and still bad is a real and important combination: 10 -> 8.
    expect(moodOutcome(10, 8)).toEqual({ improved: true, stillHighDistress: true });
    expect(moodOutcome(6, 3)).toEqual({ improved: true, stillHighDistress: false });
  });
});
