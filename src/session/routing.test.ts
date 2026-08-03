import { describe, expect, it } from 'vitest';

import { HIGH_DISTRESS_MOOD, MEANINGFUL_MOOD_DROP, PUZZLE } from '@/config/session';
import {
  aftercareKind,
  moodOutcome,
  needsTopic,
  puzzleDurationMs,
  showsCalibration,
  skipsReactivation,
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
