import { describe, expect, it } from 'vitest';

import { BREATH_CYCLE_MS } from '@/config/session';
import {
  FROG_CYCLE,
  LEAD_IN_POSE,
  PHASE_MS,
  POSE,
  POSE_COUNT,
  type PoseBeat,
} from '@/session/breathing/frog-cycle';

const phases = Object.keys(FROG_CYCLE) as (keyof typeof FROG_CYCLE)[];
const total = (bs: readonly PoseBeat[]) => bs.reduce((sum, b) => sum + b.ms, 0);

describe('the frog cycle', () => {
  // The one that matters. Every other assertion here is a way of finding out
  // why this one broke.
  it.each(phases)('fills the %s phase exactly', (phase) => {
    expect(total(FROG_CYCLE[phase])).toBe(PHASE_MS[phase]);
  });

  it('accounts for the whole breath', () => {
    expect(phases.reduce((sum, p) => sum + total(FROG_CYCLE[p]), 0)).toBe(BREATH_CYCLE_MS);
  });

  // A pose array longer than its duration array would leave beats with `ms`
  // undefined, which sums to NaN rather than throwing.
  it.each(phases)('gives every %s pose a duration', (phase) => {
    for (const beat of FROG_CYCLE[phase]) expect(beat.ms).toBeGreaterThan(0);
  });

  it('uses all eight drawings', () => {
    const used = new Set(phases.flatMap((p) => FROG_CYCLE[p].map((b) => b.pose)));
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
    const order = FROG_CYCLE[phase].map((b) => b.pose);
    for (let i = 1; i < order.length; i += 1) expect(order[i]).not.toBe(order[i - 1]);
  });

  it('closes the loop, so the last cycle runs into the next without a jump', () => {
    const order = phases.flatMap((p) => FROG_CYCLE[p].map((b) => b.pose));
    // Where the lead-in parks the frog is also where the cycle has to leave it.
    expect(order.at(-1)).toBe(LEAD_IN_POSE);
  });
});
