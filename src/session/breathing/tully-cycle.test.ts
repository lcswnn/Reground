import { describe, expect, it } from 'vitest';

import { BREATH_CYCLE_MS } from '@/config/session';
import {
  LEAD_IN_POSE,
  PHASE_MS,
  POSE,
  POSE_COUNT,
  TULLY_CYCLE,
  type PoseBeat,
} from '@/session/breathing/tully-cycle';

const phases = Object.keys(TULLY_CYCLE) as (keyof typeof TULLY_CYCLE)[];
const total = (bs: readonly PoseBeat[]) => bs.reduce((sum, b) => sum + b.ms, 0);

describe('the Tully cycle', () => {
  // The one that matters. Every other assertion here is a way of finding out
  // why this one broke.
  it.each(phases)('fills the %s phase exactly', (phase) => {
    expect(total(TULLY_CYCLE[phase])).toBe(PHASE_MS[phase]);
  });

  it('accounts for the whole breath', () => {
    expect(phases.reduce((sum, p) => sum + total(TULLY_CYCLE[p]), 0)).toBe(BREATH_CYCLE_MS);
  });

  // A pose array longer than its duration array would leave beats with `ms`
  // undefined, which sums to NaN rather than throwing.
  it.each(phases)('gives every %s pose a duration', (phase) => {
    for (const beat of TULLY_CYCLE[phase]) expect(beat.ms).toBeGreaterThan(0);
  });

  it('uses all six drawings', () => {
    const used = new Set(phases.flatMap((p) => TULLY_CYCLE[p].map((b) => b.pose)));
    expect(used.size).toBe(POSE_COUNT);
  });

  it('indexes poses inside the artwork that exists', () => {
    for (const pose of Object.values(POSE)) {
      expect(pose).toBeGreaterThanOrEqual(0);
      expect(pose).toBeLessThan(POSE_COUNT);
    }
  });

  // Within a phase only. Across a phase boundary a repeat is meaningful: the
  // exhale lands on `bottom` and the rest holds it there, which is one still
  // stretch at the floor of the breath and exactly what the rest is for.
  it.each(phases)('never repeats a pose back to back inside %s', (phase) => {
    const order = TULLY_CYCLE[phase].map((b) => b.pose);
    for (let i = 1; i < order.length; i += 1) expect(order[i]).not.toBe(order[i - 1]);
  });

  it('closes the loop, so the last cycle runs into the next without a jump', () => {
    const order = phases.flatMap((p) => TULLY_CYCLE[p].map((b) => b.pose));
    // Where the lead-in parks Tully is also where the cycle has to leave them.
    expect(order.at(-1)).toBe(LEAD_IN_POSE);
  });

  // Only the inhale was drawn. The exhale is those drawings played backwards,
  // and this is the assertion that keeps it that way — the whole cycle has to
  // read as one ramp climbed and then descended, with no drawing appearing on
  // the way down that was not on the way up.
  it('climbs to the peak and comes back down the same drawings', () => {
    // Read with the resting pose in front: the cycle joins onto itself at
    // `bottom`, so the first inhale starts one drawing up from the floor and
    // the ramp is only whole once the rest before it is counted.
    const order = [LEAD_IN_POSE, ...phases.flatMap((p) => TULLY_CYCLE[p].map((b) => b.pose))];
    const top = order.indexOf(POSE.peak);

    const up = order.slice(0, top + 1);
    const down = order.slice(top);

    expect(up).toStrictEqual([...up].sort((a, b) => a - b));
    expect(down).toStrictEqual([...down].sort((a, b) => b - a));
    // Mirrored, not merely monotonic: the way down draws nothing new.
    expect(new Set(down)).toStrictEqual(new Set(up));
  });
});
