import type { MetricDirection, MetricPoint } from '@/types/database';

/**
 * Local calendar date as `YYYY-MM-DD` — matches Postgres `date` columns.
 *
 * Not `toISOString().slice(0, 10)` on its own: that converts to UTC first, so
 * anyone west of Greenwich gets yesterday's date for most of the evening.
 */
export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function todayISO(date = new Date()): string {
  return toISODate(date);
}

/** A stored `YYYY-MM-DD` back as a local Date, with no timezone shift. */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function formatBirthday(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * How old a story is *to this reader* — time since it reached the feed, not
 * since its source published it.
 *
 * The two differ by design. The ingest job windows 36 hours back, so a piece
 * published yesterday evening is written this morning; dating it "Yesterday"
 * puts a stale label on something the reader is seeing for the first time, and
 * now contradicts the feed's own ordering, which is by arrival.
 *
 * The later of the two rather than `createdAt` outright: a hand-entered or
 * backfilled row can carry a `created_at` that precedes its publication date,
 * and "arrived before it was written" is not a thing to render.
 */
export function formatStoryAge(publishedAt: string, createdAt: string): string {
  const published = Date.parse(publishedAt);
  const created = Date.parse(createdAt);

  if (!Number.isFinite(created)) return formatRelative(publishedAt);
  if (!Number.isFinite(published)) return formatRelative(createdAt);

  return formatRelative(created > published ? createdAt : publishedAt);
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);

  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatValue(value: number, unit: string): string {
  const abs = Math.abs(value);
  let body: string;

  if (unit === '%') {
    body = `${value.toFixed(1)}%`;
  } else if (abs >= 1_000_000_000) {
    body = `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (abs >= 1_000_000) {
    body = `${(value / 1_000_000).toFixed(1)}M`;
  } else if (abs >= 1_000) {
    body = `${(value / 1_000).toFixed(1)}K`;
  } else {
    body = `${Math.round(value * 10) / 10}`;
  }

  return unit && unit !== '%' ? `${body} ${unit}` : body;
}

export interface MetricTrend {
  changePct: number;
  /** True when the change moves in the direction that counts as progress. */
  isProgress: boolean;
  label: string;
  fromPeriod: string;
  toPeriod: string;
}

/**
 * Compares the first and last points of a series. Returns null when there is
 * not enough data, or when the baseline is zero and a percentage would be
 * meaningless.
 */
export function computeTrend(
  points: MetricPoint[],
  direction: MetricDirection,
): MetricTrend | null {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (first.value === 0) return null;

  const changePct = ((last.value - first.value) / Math.abs(first.value)) * 100;
  const rose = changePct > 0;
  const isProgress = direction === 'up_is_good' ? rose : !rose;

  return {
    changePct,
    isProgress,
    label: `${rose ? '↑' : '↓'} ${Math.abs(changePct).toFixed(0)}%`,
    fromPeriod: first.period.slice(0, 4),
    toPeriod: last.period.slice(0, 4),
  };
}
