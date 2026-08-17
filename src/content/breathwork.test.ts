import { describe, expect, it } from 'vitest';

import { BREATHWORK } from '@/config/session';
import {
  BREATH_PATTERNS,
  describeRun,
  findPattern,
  patternCycleMs,
  patternRate,
  patternRunMs,
} from '@/content/breathwork';
import { describeLength } from '@/content/duration';
import { BREATHWORK_COPY } from '@/content/strings';

describe('the breathing catalog', () => {
  it('has unique ids', () => {
    expect(new Set(BREATH_PATTERNS.map((p) => p.id)).size).toBe(BREATH_PATTERNS.length);
  });

  it('finds a pattern by id and nothing by a stale one', () => {
    expect(findPattern('box')?.title).toBe('Box breathing');
    // @ts-expect-error — an id that isn't in the union, as a deep link would be.
    expect(findPattern('coherent')).toBeUndefined();
  });

  /**
   * The picker is a choice or it is a screen to tap through. What separates
   * these is not effectiveness — it is what a particular body will put up with,
   * which nothing in the session knows — so there has to be more than one.
   */
  it('gives the picker something to choose between', () => {
    expect(BREATH_PATTERNS.length).toBeGreaterThan(1);
  });
});

/**
 * Copy is not usually worth a test, and this is the same exception
 * `somatic.test.ts` makes: nothing in the components notices if a pattern ships
 * without the parts that make it doable or honest. A missing `evidence` line
 * still renders — as a heading with nothing under it, on the screen whose whole
 * job is to let somebody decide whether this is worth a minute.
 */
describe('every pattern is followable and honest', () => {
  it('says how to do it, in more than one step', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(pattern.steps.length, pattern.id).toBeGreaterThan(1);
      pattern.steps.forEach((step) => {
        expect(step.trim(), pattern.id).not.toBe('');
      });
    });
  });

  it('says what to notice while it runs', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(pattern.notice.trim().length, pattern.id).toBeGreaterThan(40);
    });
  });

  /**
   * The field that keeps this list from being a menu of vibes. Two of these
   * four are far better known than the trials support, and the line is where
   * that gets said out loud — see the note at the top of `breathwork.ts`.
   */
  it('says what is actually known about it', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(pattern.evidence.trim().length, pattern.id).toBeGreaterThan(100);
    });
  });

  /**
   * The blurb opens with the count, because on this list the numbers are what
   * tells the options apart and they have to be scannable down it. The somatic
   * list makes the same rule about what the room has to allow.
   */
  it('opens the blurb with the count', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(
        pattern.blurb.startsWith(pattern.count),
        `${pattern.id}: ${pattern.blurb}`,
      ).toBe(true);
    });
  });

  /**
   * The count is a promise made by name — "4 in, hold 7, out 8" — and the
   * circle has to take exactly that long or the name is a lie. This is what
   * catches a phase whose seconds were changed without its label.
   */
  it('names every second the pattern actually runs', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      pattern.phases.forEach((phase) => {
        expect(pattern.count, `${pattern.id}: ${phase.kind}`).toContain(
          String(phase.seconds),
        );
      });
    });
  });
});

/**
 * The rules these were picked under, as arithmetic. None of them is a rendering
 * failure — a pattern outside these bands still paces a circle perfectly well.
 * It just stops being one of the things this screen said it was offering.
 */
describe('the patterns are the kind of thing that was promised', () => {
  /**
   * Slow paced breathing is the family, and the trials are indexed by rate: the
   * evidence sits at roughly six breaths a minute and thins out on either side.
   * Anything at ten a minute is ordinary breathing with a circle over it, and
   * anything under three is a breath-hold exercise wearing a different name.
   */
  it('breathes slowly, at the rates the trials used', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(patternRate(pattern), pattern.id).toBeGreaterThanOrEqual(3);
      expect(patternRate(pattern), pattern.id).toBeLessThanOrEqual(7);
    });
  });

  /**
   * Every one of these has to breathe in and breathe out. A pattern of holds
   * with no exhale is not a thing that was left out by accident — it is the
   * kind of typo that produces a circle which fills and never empties.
   */
  it('inhales and exhales in every round', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      const kinds = pattern.phases.map((phase) => phase.kind);
      expect(kinds, pattern.id).toContain('in');
      expect(kinds, pattern.id).toContain('out');
    });
  });

  /**
   * The exhale is never the shorter half. That is the one thing the whole slow
   * breathing literature agrees on, and the three patterns here that are not
   * exhale-led are even rather than inhale-led.
   */
  it('never spends longer breathing in than out', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      const spent = (kind: 'in' | 'out') =>
        pattern.phases
          .filter((phase) => phase.kind === kind)
          .reduce((total, phase) => total + phase.seconds, 0);

      expect(spent('out'), pattern.id).toBeGreaterThanOrEqual(spent('in'));
    });
  });

  /**
   * The same band the somatic movements run in, and for the same reason: long
   * enough to be the exercise rather than a gesture at it, short enough that
   * someone at the end of a ten-minute session will actually sit through it.
   */
  it('runs in the low minutes', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(patternRunMs(pattern), pattern.id).toBeGreaterThanOrEqual(60_000);
      expect(patternRunMs(pattern), pattern.id).toBeLessThanOrEqual(180_000);
    });
  });

  /**
   * The lead-in holds the circle still while the screen finishes arriving. It
   * has to be short against a round, or the first thing a counted pattern does
   * is sit there for a comparable length of time doing nothing.
   */
  it('holds still for less than a single round before starting', () => {
    const shortestCycle = Math.min(...BREATH_PATTERNS.map(patternCycleMs));
    expect(BREATHWORK.leadInMs).toBeGreaterThan(0);
    expect(BREATHWORK.leadInMs).toBeLessThan(shortestCycle);
  });
});

/**
 * The intro screen states the length before the user commits to it, and it is
 * interpolated rather than written into the copy — same rule `describeDuration`
 * follows for the somatic movements and `BREATHE_INTRO.shape` for the sigh.
 * These are what stop the interpolation producing something that isn't English.
 */
describe('describeLength', () => {
  it('rounds to the nearest half minute', () => {
    expect(describeLength(60_000)).toBe('about a minute');
    expect(describeLength(90_000)).toBe('about a minute and a half');
    expect(describeLength(96_000)).toBe('about a minute and a half');
    expect(describeLength(120_000)).toBe('about two minutes');
  });

  it('never says nothing at all', () => {
    expect(describeLength(0)).toBe('about half a minute');
    expect(describeLength(1_000)).toBe('about half a minute');
  });

  it('says something for every pattern on the list', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(describeLength(patternRunMs(pattern)), pattern.id).toMatch(/^about /);
    });
  });
});

describe('describeRun', () => {
  it('quotes the rounds the pattern actually runs', () => {
    BREATH_PATTERNS.forEach((pattern) => {
      expect(describeRun(pattern), pattern.id).toContain(String(pattern.rounds));
      expect(describeRun(pattern), pattern.id).toContain('rounds');
    });
  });
});

/**
 * The four cautions are the difference between these working and making
 * somebody dizzy, and two of them cut against what an anxious person told to
 * breathe will do on their own. The first is the one with a trial behind it —
 * people paced at this rate drift into breathing too big — and the last is the
 * one that matters most, which is why it is repeated in the open while the
 * circle is running.
 */
describe('the rules shown above the list', () => {
  it('says all four', () => {
    expect(BREATHWORK_COPY.cautions).toHaveLength(4);
    BREATHWORK_COPY.cautions.forEach((rule) => {
      expect(rule.trim()).not.toBe('');
    });
  });

  it('opens on the one about not breathing too big', () => {
    expect(BREATHWORK_COPY.cautions[0].toLowerCase()).toContain('slow, not big');
  });

  it('ends on the one about stopping', () => {
    const last = BREATHWORK_COPY.cautions[BREATHWORK_COPY.cautions.length - 1];
    expect(last.toLowerCase()).toContain('stop');
  });

  it('repeats the stopping rule where the pattern is running', () => {
    expect(BREATHWORK_COPY.stopHint.toLowerCase()).toContain('stop');
  });

  /**
   * The honest size of the effect, and the one group this screen should not
   * assume it is helping — deliberate breathing sets off a panic attack in some
   * people rather than heading one off, and an app cannot tell who.
   */
  it('says how big the effect is and where it stops being the right tool', () => {
    expect(BREATHWORK_COPY.cautionsLimit.trim().length).toBeGreaterThan(40);
    expect(BREATHWORK_COPY.cautionsLimit.toLowerCase()).toContain('panic');
  });
});
