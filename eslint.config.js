// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // `src/legacy` is the previous tabs app, parked out of the router's way
    // rather than deleted. Its files still import each other by the `@/...`
    // paths they had before the move, so they cannot resolve while they sit
    // there — restoring them with `git mv` makes those paths correct again.
    // Drop this entry when the legacy app is either restored or removed.
    ignores: ["dist/*", "src/legacy/**"],
  }
]);
