/**
 * Stand-in for `expo-sqlite/localStorage/install` under vitest.
 *
 * The real module installs a `localStorage` global backed by SQLite, and it
 * cannot load outside a native runtime — importing it in node fails on
 * `expo/internal/install-global` before any test runs.
 *
 * Aliased in `vitest.config.ts`. This installs an in-memory equivalent instead,
 * so modules that persist through `localStorage` — `state/weighting.ts`,
 * `lib/streak.ts`, `lib/fresh-data.ts` — are importable and testable in node.
 *
 * Only the four methods those modules actually call are implemented. Anything
 * else would be inventing behaviour to match a shim nobody reads.
 */

const store = new Map<string, string>();

const memoryStorage = {
  getItem(key: string): string | null {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  setItem(key: string, value: string): void {
    store.set(key, String(value));
  },
  removeItem(key: string): void {
    store.delete(key);
  },
  clear(): void {
    store.clear();
  },
  get length(): number {
    return store.size;
  },
};

// Only define it if the environment has not already — `jsdom` supplies its own,
// and clobbering that would be a surprise for any test that expects it.
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
    configurable: true,
  });
}

export {};
