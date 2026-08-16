import { describe, expect, it } from 'vitest';

import { SOMATIC, SOMATIC_LEAD_IN_MS } from '@/config/session';
import {
  SOMATIC_MOVEMENTS,
  describeDuration,
  findMovement,
  formatRemaining,
} from '@/content/somatic';
import { SOMATIC_COPY } from '@/content/strings';

describe('the somatic catalog', () => {
  it('has unique ids', () => {
    expect(new Set(SOMATIC_MOVEMENTS.map((m) => m.id)).size).toBe(SOMATIC_MOVEMENTS.length);
  });

  it('finds a movement by id and nothing by a stale one', () => {
    expect(findMovement('shake')?.title).toBe('Shake it out');
    // @ts-expect-error — an id that isn't in the union, as a deep link would be.
    expect(findMovement('breathwork')).toBeUndefined();
  });

  /**
   * The picker is a choice or it is a screen to tap through, and the reason
   * there is a choice here at all is that these differ by what the room allows
   * rather than by how well they work — see the note at the top of
   * `somatic-picker.tsx`.
   */
  it('gives the picker something to choose between', () => {
    expect(SOMATIC_MOVEMENTS.length).toBeGreaterThan(1);
  });
});

/**
 * Copy is not usually worth a test, and this is the same exception
 * `strings.test.ts` makes for the 5-4-3-2-1: nothing in the components notices
 * if a movement ships without the parts that make it doable. A step list that
 * lost an entry still renders, and a `notice` line that went missing still
 * renders — as a heading with nothing under it, on the screen whose whole job
 * is to tell someone how to do a thing they cannot see.
 */
describe('every movement is actually followable', () => {
  it('says how to do it, in more than one step', () => {
    SOMATIC_MOVEMENTS.forEach((movement) => {
      expect(movement.steps.length, movement.id).toBeGreaterThan(1);
      movement.steps.forEach((step) => {
        expect(step.trim(), movement.id).not.toBe('');
      });
    });
  });

  /**
   * The step list is kept short on purpose: it has to be followed while moving
   * and it is drawn a second time under a running clock, where a list long
   * enough to scroll is a list nobody checks.
   */
  it('keeps the step list short enough to follow while moving', () => {
    SOMATIC_MOVEMENTS.forEach((movement) => {
      expect(movement.steps.length, movement.id).toBeLessThanOrEqual(5);
    });
  });

  /**
   * The field that makes these somatic rather than stretches. Without it the
   * exercise is a movement to get through, which is the specific failure every
   * source warns about.
   */
  it('says what to notice while it runs', () => {
    SOMATIC_MOVEMENTS.forEach((movement) => {
      expect(movement.notice.trim().length, movement.id).toBeGreaterThan(40);
    });
  });

  /**
   * The blurb opens with what the room has to allow, because that is what
   * decides whether a card is available to someone right now and it has to be
   * scannable down the list. Getting this wrong is not a rendering failure —
   * it is somebody tapping in and only then finding out they have to stand up.
   */
  it('opens the blurb with what the movement needs of the room', () => {
    const setups = ['Sitting.', 'Standing.', 'Somewhere you can make a noise.'];
    SOMATIC_MOVEMENTS.forEach((movement) => {
      expect(
        setups.some((setup) => movement.blurb.startsWith(setup)),
        `${movement.id}: ${movement.blurb}`,
      ).toBe(true);
    });
  });

  /**
   * The band these were chosen inside — long enough to be the exercise rather
   * than a gesture at it, short enough that someone at the end of a session
   * will actually hold still for it. A movement outside it is not broken, but
   * it is no longer one of the things this screen promised.
   */
  it('runs in the low minutes', () => {
    SOMATIC_MOVEMENTS.forEach((movement) => {
      expect(movement.seconds, movement.id).toBeGreaterThanOrEqual(60);
      expect(movement.seconds, movement.id).toBeLessThanOrEqual(300);
    });
  });
});

/**
 * The tutorial screen states the length before the user commits to it, and it
 * is interpolated from `seconds` rather than written into the copy — same rule
 * `BREATHE_INTRO.shape` follows for the breath's round count. These are what
 * stop the interpolation from producing something that isn't English.
 */
describe('describeDuration', () => {
  it('names whole minutes as minutes', () => {
    expect(describeDuration(60)).toBe('1 minute');
    expect(describeDuration(120)).toBe('2 minutes');
    expect(describeDuration(300)).toBe('5 minutes');
  });

  it('leaves everything else in seconds', () => {
    expect(describeDuration(90)).toBe('90 seconds');
    expect(describeDuration(45)).toBe('45 seconds');
  });

  it('says something for every movement on the list', () => {
    SOMATIC_MOVEMENTS.forEach((movement) => {
      const said = describeDuration(movement.seconds);
      expect(said, movement.id).toMatch(/^\d+ (minutes?|seconds)$/);
    });
  });
});

describe('formatRemaining', () => {
  it('reads as a clock', () => {
    expect(formatRemaining(120_000)).toBe('2:00');
    expect(formatRemaining(90_000)).toBe('1:30');
    expect(formatRemaining(9_000)).toBe('0:09');
  });

  /**
   * It rounds up, so the clock reads `0:01` for the whole of the last second
   * rather than sitting on `0:00` while the movement is still running.
   */
  it('holds the last second rather than showing zero early', () => {
    expect(formatRemaining(999)).toBe('0:01');
    expect(formatRemaining(1)).toBe('0:01');
    expect(formatRemaining(0)).toBe('0:00');
  });

  /**
   * The last tick can land a frame or two after the deadline. A clock briefly
   * reading `-0:01` is the app looking broken at the exact moment it is asking
   * to be trusted.
   */
  it('never goes negative', () => {
    expect(formatRemaining(-1)).toBe('0:00');
    expect(formatRemaining(-5_000)).toBe('0:00');
  });
});

/**
 * The four rules are the difference between these working and being a set of
 * stretches somebody is trying to win at, and two of them cut directly against
 * what an anxious person will do on their own. The last one — stop if it turns
 * — is the one that matters most, and it is repeated in the open on the timer
 * screen precisely because a rule about stopping is worth nothing folded away
 * behind a tap.
 */
describe('the rules shown above the list', () => {
  it('says all four', () => {
    expect(SOMATIC_COPY.principles).toHaveLength(4);
    SOMATIC_COPY.principles.forEach((rule) => {
      expect(rule.trim()).not.toBe('');
    });
  });

  it('ends on the one about stopping', () => {
    const last = SOMATIC_COPY.principles[SOMATIC_COPY.principles.length - 1];
    expect(last.toLowerCase()).toContain('stop');
  });

  it('repeats the stopping rule where the timer is running', () => {
    expect(SOMATIC_COPY.stopHint.toLowerCase()).toContain('stop');
  });

  /**
   * Written into the rules deliberately: the deeper somatic work is real and is
   * specifically the thing the literature says wants a trained person in the
   * room. An app cannot notice someone leaving their window of tolerance, so it
   * has to say what it is not.
   */
  it('says where this stops being enough', () => {
    expect(SOMATIC_COPY.principlesLimit.trim().length).toBeGreaterThan(40);
  });
});

/**
 * Not a rule about the exercises — a rule about the clock. The lead-in exists
 * so that the two standing movements are not counting down while the user is
 * still getting up, and an extension that outran the movements themselves would
 * turn "a bit longer" into a second full serving.
 */
describe('the timer config', () => {
  const shortestMs = Math.min(...SOMATIC_MOVEMENTS.map((m) => m.seconds)) * 1_000;

  it('leaves room to get into position without eating the exercise', () => {
    expect(SOMATIC_LEAD_IN_MS).toBeGreaterThan(0);
    expect(SOMATIC_LEAD_IN_MS).toBeLessThan(shortestMs / 4);
  });

  it('offers another go rather than a second full serving', () => {
    expect(SOMATIC.extendMs).toBeGreaterThan(0);
    expect(SOMATIC.extendMs).toBeLessThanOrEqual(shortestMs);
  });
});

/**
 * The count is the half of the lead-in the user can act on, and it is the half
 * nothing else would notice going wrong: a `countFrom` of zero still renders —
 * as a hold that ends on nothing, which is the exact failure the count was
 * added to fix. The timer schedules its digits off these two numbers, so a
 * lead-in that stopped accounting for both would leave the clock starting
 * somewhere other than where the count said it would.
 */
describe('the 3-2-1', () => {
  it('counts down to one from more than one', () => {
    expect(SOMATIC.countFrom).toBeGreaterThan(1);
  });

  it('counts at the speed a person counts out loud', () => {
    expect(SOMATIC.countMs).toBeGreaterThanOrEqual(600);
    expect(SOMATIC.countMs).toBeLessThanOrEqual(1_500);
  });

  it('holds long enough to be read before the count starts', () => {
    expect(SOMATIC.setMs).toBeGreaterThanOrEqual(SOMATIC.countMs);
  });

  it('accounts for the whole gap before the clock', () => {
    expect(SOMATIC_LEAD_IN_MS).toBe(SOMATIC.setMs + SOMATIC.countFrom * SOMATIC.countMs);
  });

  /**
   * The digits are numerals on screen and this is what a screen reader gets
   * instead — a bare "3" announced on its own is a quantity of nothing.
   */
  it('says what the number is counting towards', () => {
    expect(SOMATIC_COPY.countLabel(3)).toContain('3');
    expect(SOMATIC_COPY.countLabel(1).toLowerCase()).toContain('starting');
  });
});
