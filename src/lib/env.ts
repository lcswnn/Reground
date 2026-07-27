/**
 * Environment access.
 *
 * Only `EXPO_PUBLIC_*` variables are readable from app code — Expo inlines them
 * into the JS bundle at build time. That means they ship inside the IPA and can
 * be extracted from it, so nothing here is a secret. The Supabase publishable
 * key is designed for exactly this: it is safe to ship *because* Row Level
 * Security decides what it can actually read.
 *
 * Anything that must stay private (service role key, third-party news API keys)
 * belongs in an Edge Function or server, never in this file.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill it in, then restart the dev server with \`npx expo start --clear\` (env vars are inlined at bundle time, so a hot reload will not pick them up).`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: required(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
};
