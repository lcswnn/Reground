import type { MetricDirection, MetricPoint } from '@/types/database';

/** Local calendar date as `YYYY-MM-DD` — matches Postgres `date` columns. */
export function todayISO(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
