import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Scoped to the scoring model on purpose. Nothing under test here imports React
 * Native, so this runs in plain node with no Expo or Metro involvement — the
 * app's own build is untouched by it.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'data-layer/test/**/*.test.ts', 'news-layer/test/**/*.test.ts'],
    environment: 'node',
    // `src/lib/env.ts` throws at import time on a missing variable, which is the
    // right behaviour in the app — a bundle with no Supabase URL should fail
    // loudly at startup rather than at the first fetch. But it also means any
    // test touching a module that transitively imports it dies on load, and
    // `api/humanity.ts` does: its pure formatting and colour helpers sit in the
    // same file as the artifact URL.
    //
    // These are placeholders, not credentials. Nothing under test makes a
    // request; they exist only to get past the import-time guard.
    env: {
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.invalid',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key',
    },
  },
  // The constants module guards its weight check on this, the way the RN
  // runtime defines it.
  define: { __DEV__: 'true' },
  resolve: {
    alias: {
      // Order matters: the more specific entry has to come first, or the '@'
      // prefix rule would never be reached for it.
      //
      // The real module installs a SQLite-backed `localStorage` global and
      // cannot load outside a native runtime — it throws on
      // `expo/internal/install-global` before a single test runs. The stub
      // installs an in-memory equivalent, which is all these modules need.
      'expo-sqlite/localStorage/install': fileURLToPath(
        new URL('./test/stubs/localstorage-install.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
