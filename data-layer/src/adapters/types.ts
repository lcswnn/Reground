import type { Cadence, Observation } from "../types.js";

/**
 * A source adapter turns one upstream feed into `Observation`s.
 *
 * Adding a fourth or fifth is meant to be trivial: implement this, export it
 * from `registry.ts`, and point a metric config at its id. Nothing else in the
 * layer knows about specific sources.
 */
export interface SourceAdapter {
  id: string;
  label: string;

  /**
   * How often we poll, as a cron expression. Distinct from how often the data
   * changes — see `sourceUpdateCadence`. An annual source polled monthly is
   * normal and cheap; polled hourly it is just rude.
   */
  refreshCadence: string;

  /** How often the upstream number actually moves. */
  sourceUpdateCadence: Cadence;

  /**
   * The recent tail, for incremental refresh. Implementations may return the
   * full series if that is all the upstream offers — the storage layer is
   * idempotent on `(metricId, observedAt, source)`, so re-sending old points is
   * harmless.
   */
  fetchLatest(): Promise<Observation[]>;

  /**
   * Everything, for the one-shot backfill. Optional because not every source
   * exposes history: OWID's CSV does, NOAA's daily trend file does, Ember's API
   * does with a start_date. Where it is absent the backfill falls through to
   * `fetchLatest`.
   */
  fetchAll?(): Promise<Observation[]>;
}

export const USER_AGENT =
  "Reground/1.0 (+https://github.com/lucaswaunn/Reground) data-layer";

/** Shared fetch with a User-Agent, a timeout, and a bounded retry. */
export async function fetchText(
  url: string,
  options: { retries?: number; timeoutMs?: number } = {},
): Promise<string> {
  const { retries = 3, timeoutMs = 60_000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });

      // 4xx other than 429 will not improve on retry; fail fast so a bad slug
      // surfaces as a bad slug rather than as a slow timeout.
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const body = (await response.text()).slice(0, 200);
        const error = new Error(`GET ${url} -> ${response.status}: ${body}`);
        if (!retryable) throw error;
        lastError = error;
      } else {
        return await response.text();
      }
    } catch (error) {
      lastError = error;
      // An explicit non-retryable failure from above should not be retried.
      if (
        error instanceof Error &&
        /-> 4\d\d:/.test(error.message) &&
        !/429/.test(error.message)
      ) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`GET ${url} failed`);
}
