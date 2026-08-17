import { describe, expect, it } from 'vitest';

import { PMR } from '@/config/session';
import {
  PMR_ROUTINES,
  describeRoutine,
  findRoutine,
  routineRunMs,
  routineSteps,
} from '@/content/pmr';
import { PMR_COPY } from '@/content/strings';

describe('the relaxation catalog', () => {
  it('has unique ids', () => {
    expect(new Set(PMR_ROUTINES.map((r) => r.id)).size).toBe(PMR_ROUTINES.length);
  });

  it('finds a routine by id and nothing by a stale one', () => {
    expect(findRoutine('release-only')?.title).toBe('Letting go, no tensing');
    // @ts-expect-error — an id that isn't in the union, as a deep link would be.
    expect(findRoutine('sixteen-group')).toBeUndefined();
  });

  it('gives the picker something to choose between', () => {
    expect(PMR_ROUTINES.length).toBeGreaterThan(1);
  });
});

/**
 * Copy is not usually worth a test, and this is the same exception
 * `somatic.test.ts` and `breathwork.test.ts` make. Nothing in the components
 * notices if a routine ships without the parts that make it doable or honest —
 * a missing `evidence` line renders as a heading with nothing under it, on the
 * screen where somebody is deciding whether to spend three minutes.
 */
describe('every routine is followable and honest', () => {
  it('says how to do it, in more than one step', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routine.steps.length, routine.id).toBeGreaterThan(1);
      routine.steps.forEach((step) => {
        expect(step.trim(), routine.id).not.toBe('');
      });
    });
  });

  it('says what to notice while it runs', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routine.notice.trim().length, routine.id).toBeGreaterThan(40);
    });
  });

  /**
   * On this list the honest note is a dose one: the trials that produced the
   * effects ran twenty minutes with a trainer present, and every routine here
   * is a fraction of that. Each line carries its own version of that rather
   * than leaving it to be inferred from the one under the cautions.
   */
  it('says what is actually known about it', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routine.evidence.trim().length, routine.id).toBeGreaterThan(100);
    });
  });

  it('opens the blurb with the count', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(
        routine.blurb.startsWith(routine.count),
        `${routine.id}: ${routine.blurb}`,
      ).toBe(true);
    });
  });

  /**
   * The count says how many parts there are, and the intro screen shows both it
   * and the running order. A count that disagreed with the list underneath it
   * is the app miscounting its own exercise in front of the user.
   */
  it('names the number of parts it actually walks', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routine.count, routine.id).toContain(String(routine.groups.length));
    });
  });

  /** Nothing is a heading with nothing under it. */
  it('gives every part a name and something to do', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routine.groups.length, routine.id).toBeGreaterThan(1);
      routine.groups.forEach((group) => {
        expect(group.name.trim(), routine.id).not.toBe('');
        expect(group.release.trim(), `${routine.id}: ${group.name}`).not.toBe('');
      });
    });
  });
});

/**
 * The mode and the data have to agree, and this is the only thing that checks
 * it. Both failures are silent: a tense-release routine with a null `tense`
 * quietly drops a step, and a release-only routine with a `tense` string
 * quietly grows one — in the second case telling somebody who picked the
 * no-tensing routine to squeeze.
 */
describe('tensing matches the mode', () => {
  it('gives every part a way to tense it when the routine tenses', () => {
    PMR_ROUTINES.filter((routine) => routine.mode === 'tense-release').forEach(
      (routine) => {
        expect(routine.tenseSeconds, routine.id).toBeGreaterThan(0);
        routine.groups.forEach((group) => {
          expect(group.tense, `${routine.id}: ${group.name}`).not.toBeNull();
        });
      },
    );
  });

  it('never tenses anything when the routine says it does not', () => {
    PMR_ROUTINES.filter((routine) => routine.mode !== 'tense-release').forEach(
      (routine) => {
        expect(routine.tenseSeconds, routine.id).toBe(0);
        routine.groups.forEach((group) => {
          expect(group.tense, `${routine.id}: ${group.name}`).toBeNull();
        });
        routineSteps(routine).forEach((step) => {
          expect(step.kind, routine.id).toBe('release');
        });
      },
    );
  });

  /** The word is the whole technique on the cue routine, and meaningless off it. */
  it('carries a word only where the word is the point', () => {
    PMR_ROUTINES.forEach((routine) => {
      if (routine.mode === 'cue') expect(routine.word, routine.id).toBeTruthy();
      else expect(routine.word, routine.id).toBeNull();
    });
  });
});

/**
 * The expansion the runner walks. Getting this wrong does not throw and does
 * not render badly — it produces a routine that runs the wrong number of beats,
 * which is only visible by sitting through the whole thing.
 */
describe('routineSteps', () => {
  it('gives a tense and a release for every part of a tensing routine', () => {
    PMR_ROUTINES.filter((r) => r.mode === 'tense-release').forEach((routine) => {
      const steps = routineSteps(routine);
      expect(steps.length, routine.id).toBe(routine.groups.length * 2);
      expect(steps.filter((s) => s.kind === 'tense').length, routine.id).toBe(
        routine.groups.length,
      );
    });
  });

  it('gives one release per part of a non-tensing routine', () => {
    PMR_ROUTINES.filter((r) => r.mode !== 'tense-release').forEach((routine) => {
      expect(routineSteps(routine).length, routine.id).toBe(routine.groups.length);
    });
  });

  it('always tenses a part before it releases it', () => {
    PMR_ROUTINES.filter((r) => r.mode === 'tense-release').forEach((routine) => {
      const steps = routineSteps(routine);
      for (let i = 0; i < steps.length; i += 2) {
        expect(steps[i].kind, routine.id).toBe('tense');
        expect(steps[i + 1].kind, routine.id).toBe('release');
        // The pair has to be about the same part of the body. A tense of the
        // shoulders followed by a release of the legs is the failure mode of
        // ever flattening these two lists separately.
        expect(steps[i + 1].group, routine.id).toBe(steps[i].group);
      }
    });
  });

  it('gives every step something to say and a length to say it for', () => {
    PMR_ROUTINES.forEach((routine) => {
      routineSteps(routine).forEach((step) => {
        expect(step.instruction.trim(), routine.id).not.toBe('');
        expect(step.seconds, routine.id).toBeGreaterThan(0);
      });
    });
  });
});

/**
 * The protocol, as arithmetic. None of these is a rendering failure — a routine
 * outside them still runs. It just stops being the technique the `evidence`
 * line is claiming trials for.
 */
describe('the routines follow the protocol they claim', () => {
  /**
   * Bernstein and Borkovec settled on five to seven seconds of tension and the
   * scripts written from them have used it ever since: long enough to find the
   * muscle, short enough not to start cramping. A caution about not straining
   * means nothing if the app then asks for a fifteen-second squeeze.
   */
  it('holds a tense for about as long as the manuals say', () => {
    PMR_ROUTINES.filter((r) => r.mode === 'tense-release').forEach((routine) => {
      expect(routine.tenseSeconds, routine.id).toBeGreaterThanOrEqual(5);
      expect(routine.tenseSeconds, routine.id).toBeLessThanOrEqual(10);
    });
  });

  /**
   * The letting go is the exercise and the tensing is a way of finding the
   * muscle. A release shorter than its own tense would be the technique done
   * backwards, and every published script leaves it several times longer.
   */
  it('always spends longer letting go than tensing', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routine.releaseSeconds, routine.id).toBeGreaterThan(routine.tenseSeconds);
    });
  });

  /**
   * The same band the somatic movements and the breathing patterns run in.
   * These are the longest things in the step — the seven-group routine is
   * deliberately near the top of it — and anything past five minutes is no
   * longer something someone will sit through at the end of a session they have
   * already given ten to.
   */
  it('runs in the low minutes', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(routineRunMs(routine), routine.id).toBeGreaterThanOrEqual(60_000);
      expect(routineRunMs(routine), routine.id).toBeLessThanOrEqual(300_000);
    });
  });

  /**
   * The list is a ladder and the copy says so, which is only true while the
   * routines are actually ordered by length. Somebody reading "in the order it
   * is normally learned" down a list that went short-to-long would be reading
   * the opposite of what the screen shows.
   */
  it('is ordered longest first, which is what the lead claims', () => {
    const lengths = PMR_ROUTINES.map(routineRunMs);
    lengths.forEach((length, index) => {
      if (index === 0) return;
      expect(length, PMR_ROUTINES[index].id).toBeLessThanOrEqual(lengths[index - 1]);
    });
  });

  /**
   * The lead-in is the longest in the app because it is asking somebody to sit
   * back and possibly close their eyes. It still cannot be a meaningful share
   * of the shortest routine, or the pocket version is mostly a wait.
   */
  it('leaves room to settle without eating the routine', () => {
    const shortest = Math.min(...PMR_ROUTINES.map(routineRunMs));
    expect(PMR.leadInMs).toBeGreaterThan(0);
    expect(PMR.leadInMs).toBeLessThan(shortest / 4);
  });
});

/**
 * The length, and only the length — the count is already in the eyebrow
 * directly above it on the intro screen, so a line starting with a number here
 * would be the same figure twice in two different nouns. Anchoring on "about"
 * is what says that: a count prefix could not pass it.
 */
describe('describeRoutine', () => {
  it('says how long and nothing else, for every routine', () => {
    PMR_ROUTINES.forEach((routine) => {
      expect(describeRoutine(routine), routine.id).toMatch(/^about /);
    });
  });
});

/**
 * The four rules, one of which had to be written carefully. Deliberate
 * relaxation makes a minority of people more anxious rather than less — it is
 * well enough documented to have a name, and in the study that named it roughly
 * a third of chronically tense people doing progressive relaxation hit it. That
 * is common enough that somebody using this app will, and the worst outcome is
 * that they read it as evidence they are beyond help.
 */
describe('the rules shown above the list', () => {
  it('says all four', () => {
    expect(PMR_COPY.cautions).toHaveLength(4);
    PMR_COPY.cautions.forEach((rule) => {
      expect(rule.trim()).not.toBe('');
    });
  });

  it('opens on the one about not tensing too hard', () => {
    expect(PMR_COPY.cautions[0].toLowerCase()).toContain('three-quarters');
  });

  it('ends on the one about stopping', () => {
    const last = PMR_COPY.cautions[PMR_COPY.cautions.length - 1];
    expect(last.toLowerCase()).toContain('stop');
  });

  it('repeats the stopping rule where the routine is running', () => {
    expect(PMR_COPY.stopHint.toLowerCase()).toContain('stop');
  });

  /**
   * The gap between what the trials ran and what this screen offers. Every
   * `evidence` line leans on it, so the one place it is stated in full has to
   * actually be there.
   */
  it('says how much smaller a dose this is than the research used', () => {
    expect(PMR_COPY.cautionsLimit.trim().length).toBeGreaterThan(40);
    expect(PMR_COPY.cautionsLimit.toLowerCase()).toContain('minute');
  });

  /**
   * The lead has to say the list is a ladder rather than four alternatives —
   * somebody who taps the shortest because it is shortest has the last rung
   * without the ladder. See the note on `PMR_COPY`.
   */
  it('explains that the four are one technique at four lengths', () => {
    expect(PMR_COPY.lead.toLowerCase()).toContain('lengths');
  });
});
