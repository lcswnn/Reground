import type { MetricConfig } from '../types.js';

/**
 * The sixteen indicators, with anchors re-derived from the real series rather
 * than from the hand-authored constants they replace.
 *
 * Every `baselineValue` below is an actual observation at the stated year,
 * pulled by `jobs/anchors.ts`, not an estimate. Targets remain editorial: where
 * an SDG states a number it is cited, and where it does not, `basis` says so.
 *
 * Weights total 1.00, grouped roughly:
 *   poverty/hunger 0.18 · health 0.24 · education 0.14 · environment 0.07
 *   · climate detractors 0.14 · safety 0.11 · access 0.09 · technology 0.03
 *
 * Health carries the most because three of the four things this set can say
 * about a life — whether a child survives it, how long it runs, whether the
 * mother survives its beginning — are health measures. That is a judgement, not
 * a derivation, and it is the number most worth arguing with here.
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
    weight: 0.1,
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
    weight: 0.09,
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
    weight: 0.08,
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
    weight: 0.08,
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
    weight: 0.07,
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
    weight: 0.07,
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
    weight: 0.07,
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
    weight: 0.07,
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
    weight: 0.06,
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
    weight: 0.06,
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
    weight: 0.04,
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
  {
    id: 'maternal-mortality',
    label: 'Maternal deaths',
    category: 'health',
    baselineValue: 428.5482,
    targetValue: 70,
    direction: 'lower_is_better',
    weight: 0.04,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    // Five, not fifteen. This series fell steeply through 2012 and has been
    // flat since — 215.5 in 2016 against 212.2 in 2020. A fifteen-year window
    // fits the old decline and projects it onward, which invents about 45
    // deaths per 100,000 of progress that stopped happening a decade ago. The
    // short window tracks the stall, which is the honest reading and also the
    // more useful one: this is a metric the world is no longer winning.
    trailingWindowYears: 5,
    sourceAdapterId: 'owid:maternal-mortality',
    owidSlug: 'maternal-mortality',
    unit: '/100k',
    basis:
      'SDG 3.1 states the target outright: under 70 maternal deaths per 100,000 live births by 2030. Baseline is the real 1985 world ratio (428.5), the first year of the series. Note the series ends at 2020, so today\'s figure is a six-year projection and its confidence is scored down accordingly.',
  },
  {
    id: 'vaccination-coverage',
    label: 'Children vaccinated',
    category: 'health',
    baselineValue: 20,
    targetValue: 90,
    direction: 'higher_is_better',
    weight: 0.04,
    polarity: 'contributor',
    // Plateaued in the high 70s/80s with a COVID dip and recovery. A
    // compounding fit would read that plateau as continued growth.
    nowcastMethod: 'linear',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:global-vaccination-coverage',
    owidSlug: 'global-vaccination-coverage',
    // The chart carries nine antigens; DTP3 is the ninth and is the one WHO and
    // UNICEF report as *the* coverage headline. See `owidColumnIndex`.
    owidColumnIndex: 8,
    unit: '%',
    basis:
      'DTP3 coverage, the WHO/UNICEF headline immunisation measure. Target is 90%, the Immunization Agenda 2030 goal, rather than 100% — no country sustains universal coverage and scoring against it would make a solved problem look permanently unsolved. Baseline is the real 1980 world coverage (20%).',
  },
  {
    id: 'solar-price',
    label: 'Price of solar power',
    category: 'technology',
    // 2010, not 1975. The series starts at $128/W, and against any sane target
    // that baseline puts today's $0.26 at 99.9% of the span — the metric would
    // pin full on arrival and never move again. Anchoring inside the era where
    // the decline is still doing visible work is what keeps the score
    // informative. The full history is still charted and still carries the
    // headline; only the scoring anchor is recent.
    baselineValue: 2.4434,
    targetValue: 0.1,
    direction: 'lower_is_better',
    // The lightest weight in the set, deliberately. Even anchored at 2010 this
    // sits near its target, so it has little room left to move the composite —
    // its value to the app is as a story, not as a score.
    weight: 0.03,
    polarity: 'contributor',
    // The one genuinely exponential series in the set — Swanson's law. A linear
    // fit on a cost curve that falls by a fifth a year projects straight through
    // zero into negative dollars per watt.
    nowcastMethod: 'cagr',
    trailingWindowYears: 10,
    sourceAdapterId: 'owid:solar-pv-prices',
    owidSlug: 'solar-pv-prices',
    unit: '$/W',
    basis:
      'No SDG figure. Photovoltaic module price per watt, the clearest single number for "a technology got cheap enough to matter" — down from $128/W in 1975 to $0.26 in 2024. Target is $0.10/W. Baseline is the real 2010 world price ($2.44/W); see the note above on why not 1975.',
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
