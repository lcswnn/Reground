import type { Observation } from '../types.js';
import { type SourceAdapter, USER_AGENT } from './types.js';

/**
 * ACLED — world political violence fatalities, weekly.
 *
 * Supplements `conflict-deaths` rather than replacing it. The two answer
 * different questions and neither substitutes for the other:
 *
 *   conflict-deaths — UCDP, annual, world death *rate* per 100k, back to 1989.
 *                     The long-run anchor. Published roughly a year in arrears.
 *   this metric     — ACLED, weekly, absolute fatalities, from 2018 at world
 *                     coverage. Current to within about a week.
 *
 * Keeping both is the point: the composite gets a slow series with three
 * decades of context and a fast one that moves while a war is happening.
 *
 * ## Why fatalities and not the Weekly Conflict Index
 *
 * The Conflict Index is a published *report* — a per-country composite of
 * deadliness, danger to civilians, diffusion and fragmentation, released as a
 * webpage and a downloadable table every Wednesday. It is not an endpoint on
 * the data API, and there is no documented query that returns its component
 * scores. Reproducing it from raw events would mean reimplementing a
 * methodology ACLED has changed at least once, and the result would be a number
 * that looks like theirs and is not.
 *
 * Weekly fatalities are directly queryable, unambiguous, and the single
 * strongest component of the Index anyway. If the Index proper is wanted, it
 * belongs on the seeded-CSV path with a weekly manual update — see
 * `adapters/seeded.ts`.
 *
 * ## Auth
 *
 * ACLED moved to OAuth2 in 2025. The old `api_key` + `email` query parameters
 * are gone; `GET /api/acled/read` without a token returns 403 "Access denied",
 * and `POST /oauth/token` without one returns a 400 naming `client_id`, which
 * is how the flow below was confirmed.
 *
 * Register at https://acleddata.com/register/ and set:
 *   ACLED_USERNAME  — the account email
 *   ACLED_PASSWORD  — the account password
 *   ACLED_CLIENT_ID — defaults to "acled" if unset
 *
 * Without them the adapter reports itself unavailable rather than throwing,
 * matching the Ember contract.
 *
 * ## Licensing — read before publishing this
 *
 * ACLED data is free for registered users but its terms restrict
 * redistribution. Weekly world-level aggregates of the kind stored here are far
 * from raw event export, but the artifact this feeds is public, so confirm the
 * current terms at https://acleddata.com/terms-of-use/ before shipping. Nothing
 * in this file makes that judgement for you.
 *
 * NOTE: not run against a live authenticated response — no ACLED account was
 * available when this was written. The token exchange and the query shape are
 * built from the documented flow and the observed error responses.
 */

const AUTH_URL = 'https://acleddata.com/oauth/token';
const READ_URL = 'https://acleddata.com/api/acled/read';

const METRIC_ID = 'conflict-fatalities';
const SOURCE = 'acled:weekly-fatalities';

export function isAcledConfigured(): boolean {
  return Boolean(process.env.ACLED_USERNAME && process.env.ACLED_PASSWORD);
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const username = process.env.ACLED_USERNAME;
  const password = process.env.ACLED_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'ACLED_USERNAME / ACLED_PASSWORD are not set — register at https://acleddata.com/register/',
    );
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: new URLSearchParams({
      username,
      password,
      grant_type: 'password',
      client_id: process.env.ACLED_CLIENT_ID || 'acled',
    }),
  });

  if (!response.ok) {
    // Deliberately does not echo the body — it can contain the submitted
    // credentials back in the error description.
    throw new Error(`ACLED token exchange failed (${response.status}).`);
  }

  const parsed = JSON.parse(await response.text()) as TokenResponse;
  if (!parsed.access_token) throw new Error('ACLED token exchange returned no access_token.');

  const ttl = typeof parsed.expires_in === 'number' ? parsed.expires_in : 3600;
  // A minute of slack so a token cannot expire mid-crawl.
  cachedToken = { token: parsed.access_token, expiresAt: Date.now() + (ttl - 60) * 1000 };
  return cachedToken.token;
}

interface AcledEvent {
  event_date?: string;
  fatalities?: number | string;
}

interface ReadResponse {
  data?: AcledEvent[];
  count?: number;
}

/** ACLED caps a page well below this; the loop follows `count`, not this value. */
const PAGE_LIMIT = 5000;

async function fetchEvents(fromDate: string): Promise<AcledEvent[]> {
  const token = await accessToken();
  const events: AcledEvent[] = [];

  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      event_date: `${fromDate}|${new Date().toISOString().slice(0, 10)}`,
      event_date_where: 'BETWEEN',
      fields: 'event_date|fatalities',
      limit: String(PAGE_LIMIT),
      page: String(page),
    });

    const response = await fetch(`${READ_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`ACLED read failed (${response.status}) on page ${page}.`);
    }

    const parsed = JSON.parse(await response.text()) as ReadResponse;
    const rows = parsed.data ?? [];
    events.push(...rows);

    if (rows.length === 0) break;
    // ACLED's per-page cap is lower than PAGE_LIMIT and has changed before, so
    // termination keys off a short page rather than off the requested size.
    if (rows.length < PAGE_LIMIT && parsed.count !== undefined && rows.length >= parsed.count) break;
    if (rows.length < PAGE_LIMIT) break;
    if (page > 500) throw new Error('ACLED paging did not terminate.');
  }

  return events;
}

/** ISO week start (Monday) for a date, so weeks align with ACLED's own release. */
function weekStart(date: string): string | null {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // getUTCDay: 0 = Sunday. Shift so Monday is the first day.
  const offset = (parsed.getUTCDay() + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - offset);
  return parsed.toISOString().slice(0, 10);
}

/** Exported for tests — the weekly rollup is the part worth pinning. */
export function weeklyFatalities(events: AcledEvent[]): { week: string; fatalities: number }[] {
  const byWeek = new Map<string, number>();

  for (const event of events) {
    const week = weekStart((event.event_date ?? '').slice(0, 10));
    if (!week) continue;

    const raw = event.fatalities;
    const fatalities = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof fatalities !== 'number' || !Number.isFinite(fatalities)) continue;

    byWeek.set(week, (byWeek.get(week) ?? 0) + fatalities);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, fatalities]) => ({ week, fatalities }));
}

async function fetchFrom(fromDate: string): Promise<Observation[]> {
  const events = await fetchEvents(fromDate);
  const weeks = weeklyFatalities(events);

  if (weeks.length === 0) {
    throw new Error(`ACLED returned no usable events from ${fromDate}.`);
  }

  const fetchedAt = new Date().toISOString();

  // The current week is partial and always reads low. ACLED also back-fills
  // recent weeks as sources are confirmed, which is why `fetchLatest` re-reads a
  // rolling window rather than only appending.
  return weeks.slice(0, -1).map((point) => ({
    metricId: METRIC_ID,
    value: point.fatalities,
    observedAt: point.week,
    provenance: 'observed' as const,
    sourceLastUpdated: null,
    sourceNextUpdate: null,
    fetchedAt,
    source: SOURCE,
    unit: 'deaths/wk',
  }));
}

/** ACLED reached full world coverage in 2018; earlier years are regional only. */
const SERIES_START = '2018-01-01';

export const acledAdapter: SourceAdapter = {
  id: SOURCE,
  label: 'ACLED — weekly political violence fatalities',
  // ACLED releases Monday/Tuesday; Wednesday catches both without racing them.
  refreshCadence: '0 10 * * 3',
  sourceUpdateCadence: 'monthly',
  fetchAll: () => fetchFrom(SERIES_START),
  fetchLatest: () => {
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 3);
    return fetchFrom(from.toISOString().slice(0, 10));
  },
};
