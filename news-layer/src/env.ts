/**
 * Loads env files for the news jobs.
 *
 * Import this first, before anything that reads `process.env`.
 *
 * Same reasoning as `data-layer/src/env.ts`: neither `tsx` nor plain `node`
 * reads a `.env` on its own — only Expo's CLI does — so the app works without
 * this and the jobs would not.
 *
 * Three files, in order:
 *
 *   .env              the Expo app's env. Read for the Supabase URL only.
 *   .env.data-layer   the service_role key, shared with the ingest jobs rather
 *                     than duplicated. Both write to the same database under
 *                     the same role.
 *   .env.news-layer   ANTHROPIC_API_KEY. Separate because it is the only secret
 *                     the data layer has no business holding.
 *
 * Later files win.
 */

const FILES = ['.env', '.env.data-layer', '.env.news-layer'];

for (const file of FILES) {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    // A missing file is normal — none of these exist on a fresh clone, and
    // `--dry` runs fine with only .env.news-layer present. Anything else (a
    // malformed file, a permissions problem) is worth surfacing.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn(`[env] could not load ${file}: ${(error as Error).message}`);
    }
  }
}
