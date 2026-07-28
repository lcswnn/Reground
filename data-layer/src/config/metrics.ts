import type { MetricConfig } from '../types.js';

/**
 * The thirteen indicators, with anchors re-derived from the real series rather
 * than from the hand-authored constants they replace.
 *
 * Every `baselineValue` below is an actual observation at the stated year,
 * pulled by `jobs/anchors.ts`, not an estimate. Targets remain editorial: where
 * an SDG states a number it is cited, and where it does not, `basis` says so.
 *
 * Weights total 1.00, grouped roughly:
 *   poverty/hunger 0.20 · health 0.18 · education 0.16 · environment 0.16
 *   · climate detractors 0.16 · safety 0.12 · access 0.10
 *
 * Two metrics from the original twelve are gone. Mobile network coverage has no
 * world-level series anywhere in OWID — the nearest is mobile *subscriptions*,
 * which reads 111 per 100 people and cannot be normalised against a 100%
 * target. Girls in primary school likewise has no world aggregate. Both were
 * swapped for the nearest clean series, to be revisited.
 */
export const METRICS: MetricConfig[] = [
  {
    id: 'extreme-poverty',
    label: 'Living in extreme poverty',
    category: 'poverty',
    baselineValue: 43.414,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.11,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:share-of-population-in-extreme-poverty',
    owidSlug: 'share-of-population-in-extreme-poverty',
    // The series runs to 2026, but the last survey-backed year is 2023 — the
    // three after it are World Bank nowcasts with no marker in the payload.
    observedThroughYear: 2023,
    unit: '%',
    basis:
      'SDG 1.1: eradicate extreme poverty. Baseline is the real 1990 world value (43.4%, $3/day at 2021 PPP), not the 38% previously hardcoded.',
  },
  {
    id: 'child-mortality',
    label: 'Child mortality before 5',
    category: 'health',
    baselineValue: 9.352,
    targetValue: 2.5,
    direction: 'lower_is_better',
    weight: 0.1,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:child-mortality-igme',
    owidSlug: 'child-mortality-igme',
    unit: '%',
    basis:
      'SDG 3.2: under-5 mortality at or below 25 per 1,000 live births. Baseline is the real 1990 world rate (9.35 deaths per 100 births).',
  },
  {
    id: 'undernourishment',
    label: 'Undernourished',
    category: 'poverty',
    baselineValue: 12.7,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.09,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:prevalence-of-undernourishment',
    owidSlug: 'prevalence-of-undernourishment',
    unit: '%',
    basis:
      'SDG 2.1: end hunger. Baseline is 2000, the first year of the FAO series — the 1990 comparison the old delta string claimed is not available from this source.',
  },
  {
    id: 'adult-literacy',
    label: 'Adult literacy',
    category: 'education',
    baselineValue: 67.76,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.09,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 15,
    sourceAdapterId: 'owid:literacy',
    owidSlug: 'literacy',
    owidParams: { age_group: 'adult', sex: 'both' },
    unit: '%',
    basis:
      'SDG 4.6: all youth and most adults literate. Baseline is the real 1980 world rate (67.8%).',
  },
  {
    id: 'life-expectancy',
    label: 'Life expectancy',
    category: 'health',
    baselineValue: 63.955,
    targetValue: 80,
    direction: 'higher_is_better',
    weight: 0.08,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 15,
    sourceAdapterId: 'owid:life-expectancy',
    owidSlug: 'life-expectancy',
    unit: 'years',
    basis:
      'No SDG figure. Target is roughly what the longest-lived countries already reach. Baseline is the real 1990 world average (64.0 years) — the old 46 was the 1950 figure, which flattered the score.',
  },
  {
    id: 'renewable-share',
    label: 'Electricity from renewables',
    category: 'environment',
    baselineValue: 18.716,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.08,
    polarity: 'contributor',
    // Grows in percentage-point steps off a low base; a compounding fit
    // overstates the near term badly here.
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:share-electricity-renewables',
    owidSlug: 'share-electricity-renewables',
    unit: '%',
    basis:
      'No SDG figure (7.2 says only "substantially increase"). Target is fully decarbonised electricity. Baseline is the real 2000 world share (18.7%). Upgraded to monthly resolution by the Ember adapter where a key is configured.',
  },
  {
    id: 'co2-per-person',
    label: 'CO₂ per person',
    category: 'environment',
    baselineValue: 4.267,
    targetValue: 2.0,
    direction: 'lower_is_better',
    weight: 0.08,
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:co-emissions-per-capita',
    owidSlug: 'co-emissions-per-capita',
    unit: 't',
    basis:
      'No SDG figure. Target is the per-capita level broadly consistent with 1.5°C. Baseline is the real 1990 world value (4.27 t); emissions are above it, so this subtracts.',
  },
  {
    id: 'co2-concentration',
    label: 'Atmospheric CO₂',
    category: 'environment',
    baselineValue: 401.59,
    targetValue: 350,
    direction: 'lower_is_better',
    weight: 0.08,
    polarity: 'detractor',
    // Genuinely daily and near-monotonic, so the trend is tight and the
    // projection barely has to work.
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'noaa:co2-trend-gl',
    unit: 'ppm',
    basis:
      'Baseline is the first point in NOAA\'s global daily trend series (401.6 ppm, Jan 2016). Target is 350 ppm, the level commonly cited as a long-run ceiling. This has risen every year of the record, so it subtracts and will keep subtracting.',
  },
  {
    id: 'conflict-deaths',
    label: 'Deaths in conflict',
    category: 'safety',
    baselineValue: 1.302,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.07,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:death-rate-in-armed-conflicts',
    owidSlug: 'death-rate-in-armed-conflicts',
    unit: '/100k',
    basis:
      'No SDG figure (16.1). Target is zero. Baseline is the real 1989 world rate (1.30 per 100k), the first year of the UCDP series. All conflict types. The current rate is well above the baseline, so this normalises negative.',
  },
  {
    id: 'years-of-schooling',
    label: 'Years of schooling',
    category: 'education',
    baselineValue: 6.175,
    targetValue: 12,
    direction: 'higher_is_better',
    weight: 0.07,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 30,
    sourceAdapterId: 'owid:mean-years-of-schooling-long-run',
    owidSlug: 'mean-years-of-schooling-long-run',
    unit: 'years',
    basis:
      'Replaces "girls in primary school", which has no world-level series. Target is 12 years, i.e. completed secondary. Baseline is the real 1990 world average (6.18 years). Note: this dataset has not been updated since 2023 and ends at 2020.',
  },
  {
    id: 'homicide-rate',
    label: 'Homicide rate',
    category: 'safety',
    baselineValue: 6.898,
    targetValue: 2.0,
    direction: 'lower_is_better',
    weight: 0.05,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:homicide-rate-unodc',
    owidSlug: 'homicide-rate-unodc',
    unit: '/100k',
    basis:
      'No SDG figure (16.1 says "significantly reduce"). Target is roughly the rate in the safest third of countries. UNODC rather than the IHME chart, which OWID will not let us redistribute. Baseline is the real 2000 world rate (6.90 per 100k).',
  },
  {
    id: 'internet-access',
    label: 'People online',
    category: 'access',
    baselineValue: 15.6,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.05,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:share-of-individuals-using-the-internet',
    owidSlug: 'share-of-individuals-using-the-internet',
    unit: '%',
    basis:
      'SDG 9.c: universal and affordable access. Baseline is the real 2005 world share (15.6%).',
  },
  {
    id: 'electricity-access',
    label: 'Access to electricity',
    category: 'access',
    baselineValue: 78.225,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.05,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:share-of-the-population-with-access-to-electricity',
    owidSlug: 'share-of-the-population-with-access-to-electricity',
    unit: '%',
    basis:
      'SDG 7.1: universal access to affordable, reliable energy. Replaces "mobile network coverage", which has no world-level series. Baseline is the real 2000 world share (78.2%).',
  },
];

/** Thrown at import time rather than silently mis-scoring. */
const weightSum = METRICS.reduce((total, metric) => total + metric.weight, 0);
if (Math.abs(weightSum - 1) > 0.001) {
  throw new Error(`Metric weights sum to ${weightSum.toFixed(3)}, expected 1.000`);
}

export function metricById(id: string): MetricConfig {
  const metric = METRICS.find((candidate) => candidate.id === id);
  if (!metric) throw new Error(`Unknown metric: ${id}`);
  return metric;
}
