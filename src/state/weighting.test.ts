import { beforeEach, describe, expect, it, vi } from 'vitest';

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

/**
 * The weighting must not cross accounts, in either direction.
 *
 * This is the bug `lib/user-scope.ts` was written for, and it came back through
 * a door that module could not close: the *asynchronous* write. `user-scope`
 * guarantees each account reads and writes its own namespace, but a write that
 * was fetched for one account and lands after another has signed in is stored
 * under whoever is current when it runs, not whoever it was for.
 *
 * Signing in as somebody else and seeing their score is the visible half. The
 * invisible half is worse: it persists to the device, and the next reconcile can
 * upload it into the wrong profile row.
 */
describe('account isolation', () => {
  const store = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });

  /**
   * Fresh instances of both modules, sharing one `user-scope`.
   *
   * The current account is module-level state in `user-scope`, and the weighting
   * store caches its own copy — so a test that did not reset both would be
   * asserting against whatever the previous one left behind.
   */
  async function reload() {
    vi.resetModules();
    const scope = await import('@/lib/user-scope');
    const weighting = await import('./weighting');
    return { scope, weighting };
  }

  const DEFAULTS = { health: 20, environment: 15, education: 14 };
  const A_WEIGHTS = { health: 89, environment: 84, education: 72 };
  const B_WEIGHTS = { health: 41, environment: 40, education: 93 };

  beforeEach(() => store.clear());

  it('does not carry one accounts saved weighting into another', async () => {
    const { scope, weighting } = await reload();

    scope.setScopeUser('user-a');
    weighting.saveWeights(A_WEIGHTS, DEFAULTS);
    expect(weighting.getWeightingState().weights).toMatchObject(A_WEIGHTS);

    scope.setScopeUser('user-b');
    expect(weighting.getWeightingState().weights).toBeNull();
  });

  it('gives each account its own weighting back on return', async () => {
    const { scope, weighting } = await reload();

    scope.setScopeUser('user-a');
    weighting.saveWeights(A_WEIGHTS, DEFAULTS);
    scope.setScopeUser('user-b');
    weighting.saveWeights(B_WEIGHTS, DEFAULTS);

    scope.setScopeUser('user-a');
    expect(weighting.getWeightingState().weights).toMatchObject(A_WEIGHTS);
    scope.setScopeUser('user-b');
    expect(weighting.getWeightingState().weights).toMatchObject(B_WEIGHTS);
  });

  it('records a weighting equal to the opening positions as a real answer', async () => {
    const { scope, weighting } = await reload();
    scope.setScopeUser('user-a');

    // What "Use the research weighting" does. The stored weights are identical
    // to the starting positions, and that must still read as an answer — `null`
    // is what means "has not answered", not "answered with these numbers".
    // Without this distinction the opt-in button cannot exist.
    weighting.saveWeights(DEFAULTS, DEFAULTS);

    expect(weighting.getWeightingState().weights).toMatchObject(DEFAULTS);
    expect(weighting.getWeightingState().updatedAt).not.toBeNull();
  });

  it('records a clear as no answer, not as a weighting of the opening positions', async () => {
    const { scope, weighting } = await reload();
    scope.setScopeUser('user-a');

    weighting.saveWeights(A_WEIGHTS, DEFAULTS);
    weighting.resetWeighting();

    expect(weighting.getWeightingState().weights).toBeNull();
  });

  it('refuses a remote weighting that arrives after the account has changed', async () => {
    const { scope, weighting } = await reload();

    // A's weighting is fetched while A is signed in...
    scope.setScopeUser('user-a');

    // ...and lands after B has signed in. This is the race: `setScopeUser` runs
    // synchronously in the auth callback, while the effect that would cancel the
    // in-flight reconcile only runs once React re-renders.
    scope.setScopeUser('user-b');

    expect(weighting.adoptRemoteWeighting('user-a', A_WEIGHTS, '2026-08-01T16:13:20Z')).toBe(
      false,
    );
    expect(weighting.getWeightingState().weights).toBeNull();

    // And B's own weighting still applies normally.
    expect(weighting.adoptRemoteWeighting('user-b', B_WEIGHTS, '2026-07-31T22:45:11Z')).toBe(true);
    expect(weighting.getWeightingState().weights).toMatchObject(B_WEIGHTS);
  });

  it('refuses a remote weighting that arrives after sign-out', async () => {
    const { scope, weighting } = await reload();

    scope.setScopeUser('user-a');
    scope.setScopeUser(null);

    expect(weighting.adoptRemoteWeighting('user-a', A_WEIGHTS, null)).toBe(false);
    expect(weighting.getWeightingState().weights).toBeNull();
  });

  it('adopts normally when the account has not moved', async () => {
    const { scope, weighting } = await reload();

    scope.setScopeUser('user-a');
    expect(weighting.adoptRemoteWeighting('user-a', A_WEIGHTS, '2026-08-01T16:13:20Z')).toBe(true);

    const state = weighting.getWeightingState();
    expect(state.weights).toMatchObject(A_WEIGHTS);
    // The server's timestamp is kept, not restamped — it is what decides which
    // device wrote last.
    expect(state.updatedAt).toBe('2026-08-01T16:13:20Z');
  });
});
