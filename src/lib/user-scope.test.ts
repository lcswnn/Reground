import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));

const store = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

type Scope = typeof import('./user-scope');

/** A fresh module instance, since the current user is module-level state. */
async function reload(): Promise<Scope> {
  vi.resetModules();
  return import('@/lib/user-scope');
}

const KEY = 'humanitas.test';

beforeEach(() => {
  store.clear();
});

describe('scopedKey', () => {
  it('namespaces by user', async () => {
    const scope = await reload();
    scope.setScopeUser('user-a');
    expect(scope.scopedKey(KEY)).toBe('humanitas.test::user-a');
  });

  it('gives signed-out readers a bucket of their own rather than the bare key', async () => {
    const scope = await reload();
    expect(scope.scopedKey(KEY)).toBe('humanitas.test::anon');
  });
});

describe('account isolation', () => {
  it('does not leak one account’s value to another', async () => {
    const scope = await reload();

    scope.setScopeUser('user-a');
    scope.writeScoped(KEY, 'a-value');

    scope.setScopeUser('user-b');
    // The bug this whole module exists for: B used to read A's weighting, day
    // count and vote — and for the weighting, upload it into their own profile.
    expect(scope.readScoped(KEY)).toBeNull();
  });

  it('gives each account back its own value on return', async () => {
    const scope = await reload();

    scope.setScopeUser('user-a');
    scope.writeScoped(KEY, 'a-value');
    scope.setScopeUser('user-b');
    scope.writeScoped(KEY, 'b-value');

    scope.setScopeUser('user-a');
    expect(scope.readScoped(KEY)).toBe('a-value');
    scope.setScopeUser('user-b');
    expect(scope.readScoped(KEY)).toBe('b-value');
  });

  it('keeps signed-out writes out of the next account', async () => {
    const scope = await reload();

    scope.writeScoped(KEY, 'anon-value');
    scope.setScopeUser('user-a');

    expect(scope.readScoped(KEY)).toBeNull();
  });
});

describe('legacy adoption', () => {
  it('adopts a pre-namespacing value for the first account to sign in', async () => {
    const scope = await reload();
    store.set(KEY, 'legacy-value');

    scope.setScopeUser('user-a');
    expect(scope.readScoped(KEY)).toBe('legacy-value');
  });

  it('consumes it, so a second account cannot inherit it too', async () => {
    const scope = await reload();
    store.set(KEY, 'legacy-value');

    scope.setScopeUser('user-a');
    scope.readScoped(KEY);

    scope.setScopeUser('user-b');
    expect(scope.readScoped(KEY)).toBeNull();
    expect(store.has(KEY)).toBe(false);
  });

  it('does not consume it while signed out', async () => {
    const scope = await reload();
    store.set(KEY, 'legacy-value');

    // Readable, so nothing looks lost before sign-in — but still there for
    // whoever actually signs in.
    expect(scope.readScoped(KEY)).toBe('legacy-value');
    expect(store.get(KEY)).toBe('legacy-value');

    scope.setScopeUser('user-a');
    expect(scope.readScoped(KEY)).toBe('legacy-value');
  });

  it('prefers an existing scoped value over a legacy one', async () => {
    const scope = await reload();
    store.set(KEY, 'legacy-value');

    scope.setScopeUser('user-a');
    scope.writeScoped(KEY, 'current-value');

    expect(scope.readScoped(KEY)).toBe('current-value');
  });
});

describe('onScopeChange', () => {
  it('notifies on a real change only', async () => {
    const scope = await reload();
    let calls = 0;
    scope.onScopeChange(() => {
      calls += 1;
    });

    scope.setScopeUser('user-a');
    expect(calls).toBe(1);

    // Token refreshes fire the auth handler with the same user; re-notifying
    // would drop every store's cache several times an hour for no reason.
    scope.setScopeUser('user-a');
    expect(calls).toBe(1);

    scope.setScopeUser(null);
    expect(calls).toBe(2);
  });

  it('stops notifying once unsubscribed', async () => {
    const scope = await reload();
    let calls = 0;
    const off = scope.onScopeChange(() => {
      calls += 1;
    });

    off();
    scope.setScopeUser('user-a');
    expect(calls).toBe(0);
  });
});
