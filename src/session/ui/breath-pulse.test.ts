import { describe, expect, it } from 'vitest';

import { BREATHING } from '@/config/session';
import { BREATH_PATTERNS } from '@/content/breathwork';
import { planBreathPulses } from '@/session/ui/breath-pulse';

describe('planning a breath phase', () => {
  it('opens every phase on its own boundary', () => {
    expect(planBreathPulses('inhale', 4_000)[0].at).toBe(0);
    expect(planBreathPulses('exhale', 4_000)[0].at).toBe(0);
    expect(planBreathPulses('inhale', 500)[0].at).toBe(0);
  });

  /**
   * The convention the rest of the market settled on: the in-breath builds and
   * the out-breath falls away, so the two are told apart by feel rather than by
   * being looked at.
   */
  it('builds through an inhale and falls away through an exhale', () => {
    const inhale = planBreathPulses('inhale', 5_000);
    const exhale = planBreathPulses('exhale', 5_000);

    expect(inhale[0].strength).toBe('light');
    expect(inhale[inhale.length - 1].strength).toBe('medium');

    expect(exhale[0].strength).toBe('light');
    expect(exhale.slice(1).every((pulse) => pulse.strength === 'soft')).toBe(true);
  });

  it('never goes above the middle of the scale, and only at the top of an inhale', () => {
    for (const ms of [800, 1_400, 4_000, 8_000, 20_000]) {
      expect(planBreathPulses('exhale', ms).some((p) => p.strength === 'medium')).toBe(false);

      const inhale = planBreathPulses('inhale', ms);
      const firm = inhale.filter((pulse) => pulse.strength === 'medium');
      expect(firm.length).toBeGreaterThan(0);
      // Where there is a train, the firm one is the top of it and nothing
      // before it. A phase too short for a train is a single firm tap, which is
      // the top-up and is meant to land like one.
      if (inhale.length > 1) expect(inhale.indexOf(firm[0])).toBeGreaterThan(0);
      else expect(inhale[0].strength).toBe('medium');
    }
  });

  it('paces at about a pulse a second, and never turns into a buzz', () => {
    for (const ms of [1_000, 2_500, 4_000, 6_000, 8_000, 30_000]) {
      const pulses = planBreathPulses('exhale', ms);
      expect(pulses.length).toBeLessThanOrEqual(5);

      const gaps = pulses.slice(1).map((pulse, index) => pulse.at - pulses[index].at);
      // Evenly spaced, and never closer together than a breath can be held to.
      expect(new Set(gaps).size).toBeLessThanOrEqual(2);
      gaps.forEach((gap) => expect(gap).toBeGreaterThanOrEqual(650));
    }
  });

  it('leaves room before the next phase opens', () => {
    // The last pulse lands short of the end, so it cannot collide with the
    // pulse the following phase fires on its own boundary.
    for (const ms of [1_400, 4_000, 8_000]) {
      const pulses = planBreathPulses('inhale', ms);
      expect(pulses[pulses.length - 1].at).toBeLessThan(ms);
    }
  });

  it('gives a snatched phase one tap rather than a stutter', () => {
    // At the paced cadence two pulses inside the sigh's 600ms top-up would land
    // a third of a second apart — a double tap, which means something else. A
    // one-second phase is the same problem one step up, and takes one tap too.
    const topUp = planBreathPulses('inhale', BREATHING.secondInhaleMs);
    expect(topUp).toEqual([{ at: 0, strength: 'medium' }]);
    expect(planBreathPulses('exhale', 400)).toEqual([{ at: 0, strength: 'light' }]);
    expect(planBreathPulses('exhale', 1_000)).toEqual([{ at: 0, strength: 'light' }]);
  });

  /**
   * The sigh's own cadence. Its inhales are the shape of the technique rather
   * than a rate to hold, so they run about three taps a second — see the note
   * in `breath-pulse.ts`. Written against the real phase lengths, because the
   * only question worth asking of this is what the breath the app actually runs
   * comes out as.
   */
  describe("under the sigh's cadence", () => {
    it('runs the first inhale about three times as often as the pacer would', () => {
      const quick = planBreathPulses('inhale', BREATHING.firstInhaleMs, 'sigh');
      const paced = planBreathPulses('inhale', BREATHING.firstInhaleMs);

      expect(quick.length).toBeGreaterThan(paced.length);
      expect(quick).toEqual([
        { at: 0, strength: 'light' },
        { at: 350, strength: 'light' },
        { at: 700, strength: 'light' },
        { at: 1_050, strength: 'medium' },
      ]);
    });

    it('gives the top-up two taps, opening light and topping out firm', () => {
      expect(planBreathPulses('inhale', BREATHING.secondInhaleMs, 'sigh')).toEqual([
        { at: 0, strength: 'light' },
        { at: 300, strength: 'medium' },
      ]);
    });

    it('leaves the exhale exactly as the pacer has it', () => {
      expect(planBreathPulses('exhale', BREATHING.exhaleMs, 'sigh')).toEqual(
        planBreathPulses('exhale', BREATHING.exhaleMs),
      );
    });

    // The ceiling is the thing that keeps a faster train from becoming a buzz
    // if a phase is ever lengthened. Nothing the sigh runs today reaches it.
    it('still never becomes a buzz', () => {
      for (const ms of [1_400, 2_000, 4_000, 8_000]) {
        const pulses = planBreathPulses('inhale', ms, 'sigh');
        expect(pulses.length).toBeLessThanOrEqual(6);

        const gaps = pulses.slice(1).map((pulse, index) => pulse.at - pulses[index].at);
        gaps.forEach((gap) => expect(gap).toBeGreaterThanOrEqual(260));
        expect(pulses[pulses.length - 1].at).toBeLessThan(ms);
      }
    });

    it('still peaks at the top of the breath and nowhere else', () => {
      for (const ms of [BREATHING.firstInhaleMs, 2_000, 4_000]) {
        const pulses = planBreathPulses('inhale', ms, 'sigh');
        const firm = pulses.filter((pulse) => pulse.strength === 'medium');

        expect(firm.length).toBeGreaterThan(0);
        expect(pulses.indexOf(firm[0])).toBeGreaterThan(0);
        expect(firm[firm.length - 1]).toBe(pulses[pulses.length - 1]);
      }
    });
  });

  it('has nothing to say about a phase with no length', () => {
    expect(planBreathPulses('inhale', 0)).toEqual([]);
    expect(planBreathPulses('exhale', -1)).toEqual([]);
  });

  /**
   * Against the real numbers rather than round ones: every phase the two
   * breathing screens can actually run has to come out as something a person
   * can breathe to.
   */
  it('holds up across every phase the app can run', () => {
    const phases: number[] = [
      BREATHING.firstInhaleMs,
      BREATHING.secondInhaleMs,
      BREATHING.exhaleMs,
      ...BREATH_PATTERNS.flatMap((pattern) =>
        pattern.phases
          .filter((phase) => phase.kind === 'in' || phase.kind === 'out')
          .map((phase) => phase.seconds * 1_000),
      ),
    ];

    for (const ms of phases) {
      for (const phase of ['inhale', 'exhale'] as const) {
        const pulses = planBreathPulses(phase, ms);
        expect(pulses.length).toBeGreaterThan(0);
        expect(pulses.length).toBeLessThanOrEqual(5);
        expect(pulses[pulses.length - 1].at).toBeLessThan(ms);
      }
    }
  });
});
