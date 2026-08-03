import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Scoped to the pure logic — the session's routing and puzzle rules, and the
 * scoring model on both sides of the data pipeline. Nothing under test here
 * imports React Native, so this runs in plain node with no Expo or Metro
 * involvement; the app's own build is untouched by it.
 *
 * The data-layer and news-layer suites are what the daily refresh workflow
 * gates on, so this include list has to keep covering them.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'data-layer/test/**/*.test.ts', 'news-layer/test/**/*.test.ts'],
    environment: 'node',
  },
  // The constants module guards its weight check on this, the way the RN
  // runtime defines it.
  define: { __DEV__: 'true' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
