import { describe, expect, it } from 'vitest';

import { resolveConflict, type WeightingState } from './weighting';

/**
 * Which copy of the weighting wins.
 *
 * Worth testing more carefully than its size suggests: getting this wrong loses
 * a reader's settings silently, and they would not find out until they noticed
 * their score had reverted some weeks later. The failure has no error message
 * and no crash, so these cases are the only place it shows up.
 */

function local(
  weights: Record<string, number> | null,
  updatedAt: string | null = null,
): WeightingState {
  return { weights, updatedAt };
}

describe('resolveConflict', () => {
  it('takes the server when the device has nothing', () => {
    // The case the whole sync exists for: a reinstall, or signing in on a second
    // phone. Falling back to defaults here is exactly the bug being prevented.
    expect(
      resolveConflict(local(null), { weights: { health: 40 }, updatedAt: '2026-07-30T10:00:00Z' }),
    ).toBe('remote');
  });

  it('keeps the device when the server has nothing', () => {
    expect(resolveConflict(local({ health: 40 }, '2026-07-30T10:00:00Z'), null)).toBe('local');
  });

  it('reports neither when nobody has saved a weighting', () => {
    expect(resolveConflict(local(null), null)).toBe('neither');
  });

  it('takes whichever was written more recently', () => {
    const older = '2026-07-01T10:00:00Z';
    const newer = '2026-07-30T10:00:00Z';

    expect(
      resolveConflict(local({ health: 40 }, older), { weights: { health: 10 }, updatedAt: newer }),
    ).toBe('remote');

    expect(
      resolveConflict(local({ health: 40 }, newer), { weights: { health: 10 }, updatedAt: older }),
    ).toBe('local');
  });

  it('prefers the device when a timestamp is missing on either side', () => {
    // A copy written before the timestamp column existed. The device is the one
    // the reader physically touched, so it is the better guess — and preferring
    // the server here would let an ancient untimed row overwrite a fresh edit.
    expect(
      resolveConflict(local({ health: 40 }, null), {
        weights: { health: 10 },
        updatedAt: '2026-07-30T10:00:00Z',
      }),
    ).toBe('local');

    expect(
      resolveConflict(local({ health: 40 }, '2026-07-30T10:00:00Z'), {
        weights: { health: 10 },
        updatedAt: null,
      }),
    ).toBe('local');
  });

  it('does not treat identical timestamps as a remote win', () => {
    // The steady state after a successful sync. Adopting here would rewrite
    // local state on every launch for no reason.
    const same = '2026-07-30T10:00:00Z';
    expect(
      resolveConflict(local({ health: 40 }, same), { weights: { health: 40 }, updatedAt: same }),
    ).toBe('local');
  });

  it('compares ISO timestamps correctly across a year boundary', () => {
    // Lexicographic comparison on ISO-8601 is only safe because the format is
    // fixed-width and zero-padded. Pinned so a switch to a different timestamp
    // format cannot quietly break the ordering.
    expect(
      resolveConflict(local({ health: 40 }, '2025-12-31T23:59:59Z'), {
        weights: { health: 10 },
        updatedAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe('remote');
  });
});
