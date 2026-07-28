/**
 * Uploads the built artifact to a public Supabase Storage bucket.
 *
 *   npm run data:publish                 # builds nothing; uploads humanity.json
 *   npm run data:publish -- --in out.json
 *
 * Storage rather than an Edge Function on purpose: the artifact only changes
 * when the cron runs, so serving it as a static CDN-backed file costs nothing
 * per read, where a function would bill an invocation to return the same bytes.
 *
 * Creates the bucket on first run, so there is no dashboard step.
 */

import '../env.js';

import { readFile } from 'node:fs/promises';

import { client } from '../storage/supabase.js';
import type { Artifact } from '../types.js';

const BUCKET = 'artifacts';
const OBJECT = 'humanity.json';

/**
 * Five minutes. The artifact is rebuilt daily at most, but a short TTL means a
 * correction to a bad number reaches phones in minutes rather than hours — and
 * at this size the CDN traffic is irrelevant either way.
 */
const CACHE_SECONDS = 300;

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function ensureBucket() {
  const supabase = client();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);

  if (buckets?.some((bucket) => bucket.name === BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['application/json'],
  });
  if (createError) throw new Error(`createBucket failed: ${createError.message}`);

  console.log(`Created public bucket "${BUCKET}".`);
}

async function main() {
  const path = argValue('--in') ?? 'humanity.json';
  const body = await readFile(path, 'utf8');

  // Parse before uploading: publishing a truncated or half-written file would
  // break every client until the next cron, and the check is free.
  const artifact = JSON.parse(body) as Artifact;
  if (!artifact.metrics?.length) throw new Error(`${path} has no metrics — refusing to publish.`);
  if (typeof artifact.compositeScore !== 'number') {
    throw new Error(`${path} has no compositeScore — refusing to publish.`);
  }

  await ensureBucket();

  const { error } = await client()
    .storage.from(BUCKET)
    .upload(OBJECT, body, {
      contentType: 'application/json',
      cacheControl: String(CACHE_SECONDS),
      upsert: true,
    });

  if (error) throw new Error(`upload failed: ${error.message}`);

  const base = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const url = `${base}/storage/v1/object/public/${BUCKET}/${OBJECT}`;

  console.log(`Published ${(body.length / 1024).toFixed(1)} KB`);
  console.log(`  score    ${(artifact.compositeScore * 100).toFixed(1)}%  (${artifact.direction})`);
  console.log(`  metrics  ${artifact.metrics.length}`);
  console.log(`  url      ${url}`);
}

void main();
