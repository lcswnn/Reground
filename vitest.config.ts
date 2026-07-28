import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Scoped to the scoring model on purpose. Nothing under test here imports React
 * Native, so this runs in plain node with no Expo or Metro involvement — the
 * app's own build is untouched by it.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'data-layer/test/**/*.test.ts'],
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
