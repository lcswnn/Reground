import { supabase } from '@/lib/supabase';
import type { Metric, MetricPoint, MetricWithSeries } from '@/types/database';

/**
 * Loads every metric with its full series in two queries rather than N+1.
 * The dataset is small (tens of metrics, tens of points each), so pulling it
 * all and grouping client-side is cheaper than per-metric round trips.
 */
export async function fetchMetrics(): Promise<MetricWithSeries[]> {
  const [metricsResult, pointsResult] = await Promise.all([
    supabase.from('metrics').select('*').order('title'),
    supabase.from('metric_points').select('*').order('period'),
  ]);

  if (metricsResult.error) throw metricsResult.error;
  if (pointsResult.error) throw pointsResult.error;

  const byMetric = new Map<string, MetricPoint[]>();
  for (const point of pointsResult.data ?? []) {
    const bucket = byMetric.get(point.metric_id);
    if (bucket) {
      bucket.push(point);
    } else {
      byMetric.set(point.metric_id, [point]);
    }
  }

  return (metricsResult.data ?? []).map((metric: Metric) => ({
    ...metric,
    points: byMetric.get(metric.id) ?? [],
  }));
}

export async function fetchMetric(slug: string): Promise<MetricWithSeries | null> {
  const { data: metric, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!metric) return null;

  const { data: points, error: pointsError } = await supabase
    .from('metric_points')
    .select('*')
    .eq('metric_id', metric.id)
    .order('period');

  if (pointsError) throw pointsError;

  return { ...metric, points: points ?? [] };
}
