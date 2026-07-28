/**
 * Loads env files for the ingest jobs.
 *
 * Import this first, before anything that reads `process.env`.
 *
 * Neither `tsx` nor plain `node` reads a `.env` on its own — only Expo's CLI
 * does, which is why the app works without this and the jobs would not. Node's
 * `--env-file` flag would do it, but wrapping every npm script in another npm
 * script to pass it swallows the child process's stdout, so the loading happens
 * here instead.
 *
 * Two files, in order:
 *
 *   .env             the Expo app's env. Read for the Supabase URL only, so it
 *                    doesn't have to be repeated.
 *   .env.data-layer  server-side secrets: the service_role key and the Ember
 *                    key. Deliberately separate — .env is inlined into the app
 *                    bundle at build time, and its own header says never to put
 *                    the service_role key there.
 *
 * Later files win, so .env.data-layer can override anything in .env.
 */

const FILES = ['.env', '.env.data-layer'];

for (const file of FILES) {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    // A missing file is normal — .env.data-layer doesn't exist until someone
    // needs to write to Supabase, and preview runs fine without it. Anything
    // else (a malformed file, a permissions problem) is worth surfacing.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn(`[env] could not load ${file}: ${(error as Error).message}`);
    }
  }
}
