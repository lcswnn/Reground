/**
 * Headline indicators for the "State of the world" grid, and the config the
 * composite score is computed from.
 *
 * The current values are still hand-authored placeholders — nothing in this file
 * comes from a feed yet, and it should be replaced wholesale once one exists.
 * What is not a placeholder is the scoring config around them. Every indicator
 * declares:
 *
 *   baselineValue — the 0% anchor: the reference point progress is measured
 *                   from, generally the level at the comparison year in `delta`.
 *   targetValue   — the 100% anchor: the point at which this counts as solved.
 *   direction     — whether the number is meant to rise or fall.
 *   weight        — its share of the headline. Authored to sum to 1.
 *   polarity      — whether progress on it adds to the score, or failure on it
 *                   subtracts from it.
 *
 * Where the SDGs state a number, `basis` cites it; where they only say
 * "substantially reduce", the threshold is a judgment call and `basis` says so,
 * so it can be argued with rather than mistaken for a source. `basis` also
 * carries the reasoning for the weight, which is a judgment call in every case.
 *
 * The arithmetic that turns this into one number lives in `@/lib/scoring` and
 * knows nothing about this file.
 */

import {
  computeBreakdown,
  normalizeMetric,
  weightError,
  type MetricConfig,
} from '@/lib/scoring';

export type WorldCategory =
  | 'health'
  | 'poverty'
  | 'environment'
  | 'safety'
  | 'access'
  | 'education';

export const WORLD_CATEGORIES: Record<WorldCategory, string> = {
  health: 'Health',
  poverty: 'Poverty',
  environment: 'Environment',
  safety: 'Safety',
  access: 'Tech access',
  education: 'Education',
};

/** The scoring config, plus the display-only fields the tiles need. */
interface WorldMetricInput extends MetricConfig<WorldCategory> {
  /** Pre-formatted for display. The same figure as `currentValue`. */
  value: string;
  /** Where the anchors and the weight come from. */
  basis: string;
  /** Movement since the comparison year. */
  delta: string;
  /** False when the trend runs the wrong way, which recolors the tile. */
  isProgress: boolean;
}

export interface WorldMetric extends WorldMetricInput {
  /** 0–1, derived from `currentValue` against its two anchors. */
  progress: number;
}

/**
 * Weights are grouped by category and total 1.00:
 *
 *   poverty 0.22 · health 0.20 · environment 0.20 · education 0.18 ·
 *   safety 0.12 · tech access 0.08
 *
 * The ordering is the arguable part and is meant to be argued with. Material
 * deprivation and staying alive lead because they gate everything below them;
 * tech access trails because it's closest to being an instrument for the rest
 * rather than an end in itself.
 */
const INDICATORS: WorldMetricInput[] = [
  {
    id: 'child-mortality',
    category: 'health',
    label: 'Child mortality before 5',
    value: '3.6%',
    currentValue: 3.6,
    baselineValue: 9.3,
    targetValue: 2.5,
    direction: 'lower_is_better',
    weight: 0.11,
    polarity: 'contributor',
    basis:
      'SDG 3.2: under-5 mortality at or below 25 per 1,000 live births. Baseline is the 1990 rate. Weighted highest in health — it is the closest thing the set has to a direct count of avoidable death.',
    delta: '↓ 61% since 1990',
    isProgress: true,
  },
  {
    id: 'life-expectancy',
    category: 'health',
    label: 'Life expectancy',
    value: '73.4 yrs',
    currentValue: 73.4,
    baselineValue: 46,
    targetValue: 80,
    direction: 'higher_is_better',
    weight: 0.09,
    polarity: 'contributor',
    basis:
      'No SDG figure. Target is roughly what the longest-lived countries already reach; baseline is the 1950 global average. Slightly under child mortality because the two overlap — falling child deaths are part of what lifts this.',
    delta: '↑ 9 yrs since 1990',
    isProgress: true,
  },
  {
    id: 'extreme-poverty',
    category: 'poverty',
    label: 'Living in extreme poverty',
    value: '8.5%',
    currentValue: 8.5,
    baselineValue: 38,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.12,
    polarity: 'contributor',
    basis:
      'SDG 1.1: eradicate extreme poverty for all people everywhere. Baseline is the 1990 share. The heaviest single weight in the set: it gates schooling, nutrition, and health outcomes alike.',
    delta: '↓ 28 pts since 1990',
    isProgress: true,
  },
  {
    id: 'undernourishment',
    category: 'poverty',
    label: 'Undernourished',
    value: '9.1%',
    currentValue: 9.1,
    baselineValue: 19,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.1,
    polarity: 'contributor',
    basis:
      'SDG 2.1: end hunger and ensure access to sufficient food year-round. Baseline is the 1990–92 share. Weighted just under extreme poverty, which it largely tracks.',
    delta: '↓ 10 pts since 1990',
    isProgress: true,
  },
  {
    id: 'renewable-share',
    category: 'environment',
    label: 'Electricity from renewables',
    value: '30%',
    currentValue: 30,
    baselineValue: 19,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.08,
    polarity: 'contributor',
    basis:
      'No SDG figure (7.2 says only "substantially increase"). Target is fully decarbonized electricity; baseline is the 2000 share. Weighted as the upside half of the environment budget — the downside half is carried by CO₂ per person.',
    delta: '↑ 11 pts since 2000',
    isProgress: true,
  },
  {
    id: 'co2-per-person',
    category: 'environment',
    label: 'CO₂ per person',
    value: '4.7 t',
    currentValue: 4.7,
    baselineValue: 4.1,
    targetValue: 2.0,
    direction: 'lower_is_better',
    weight: 0.12,
    polarity: 'detractor',
    basis:
      'No SDG figure. Target is the per-capita level broadly consistent with 1.5°C; baseline is the 1990 level, the same comparison year most of this set uses. The only detractor in the set: emissions are above their own baseline, so this subtracts its full weight rather than contributing a small positive share.',
    delta: '↑ 0.6 t since 1990',
    isProgress: false,
  },
  {
    id: 'homicide-rate',
    category: 'safety',
    label: 'Homicide rate',
    value: '5.8 /100k',
    currentValue: 5.8,
    baselineValue: 7.4,
    targetValue: 2.0,
    direction: 'lower_is_better',
    weight: 0.05,
    polarity: 'contributor',
    basis:
      'No SDG figure (16.1 says "significantly reduce"). Target is roughly the rate in the safest third of countries; baseline is the 1993 peak. Weighted modestly: it moves few lives per year next to the health and poverty indicators.',
    delta: '↓ 1.4 since 1993',
    isProgress: true,
  },
  {
    id: 'conflict-deaths',
    category: 'safety',
    label: 'Deaths in conflict',
    value: '0.6 /100k',
    currentValue: 0.6,
    baselineValue: 4.0,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.07,
    polarity: 'contributor',
    basis:
      'No SDG figure (16.1). Target is zero; baseline is the mid-century post-war peak. Weighted above homicide because it is the more volatile of the two — this is where a bad decade would show up.',
    delta: '↓ 88% since 1950',
    isProgress: true,
  },
  {
    id: 'internet-access',
    category: 'access',
    label: 'People online',
    value: '68%',
    currentValue: 68,
    baselineValue: 16,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.05,
    polarity: 'contributor',
    basis:
      'SDG 9.c: universal and affordable access. Baseline is the 2005 share. Light weight: access is mostly a means to the other indicators rather than an end.',
    delta: '↑ 41 pts since 2005',
    isProgress: true,
  },
  {
    id: 'mobile-coverage',
    category: 'access',
    label: 'Mobile network coverage',
    value: '95%',
    currentValue: 95,
    baselineValue: 73,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.03,
    polarity: 'contributor',
    basis:
      'SDG 9.c: universal access. Baseline is the 2005 share of population covered. The lightest weight in the set — coverage is a precondition for being online, so it is largely already counted there.',
    delta: '↑ 22 pts since 2005',
    isProgress: true,
  },
  {
    id: 'adult-literacy',
    category: 'education',
    label: 'Adult literacy',
    value: '87%',
    currentValue: 87,
    baselineValue: 68,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.1,
    polarity: 'contributor',
    basis:
      'SDG 4.6: all youth and most adults literate and numerate. Baseline is the 1980 rate. Weighted as the broadest education measure — it covers the whole adult population rather than one cohort.',
    delta: '↑ 19 pts since 1980',
    isProgress: true,
  },
  {
    id: 'girls-in-school',
    category: 'education',
    label: 'Girls in primary school',
    value: '90%',
    currentValue: 90,
    baselineValue: 76,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.08,
    polarity: 'contributor',
    basis:
      'SDG 4.1: all girls and boys complete primary education. Baseline is the 1990 rate. Weighted just under adult literacy, which it feeds into a generation later.',
    delta: '↑ 14 pts since 1990',
    isProgress: true,
  },
];

if (__DEV__) {
  const error = weightError(INDICATORS);
  // Tolerance is floating-point slack, not a budget: 0.01 is smaller than any
  // weight above, so a metric added without adjusting the others still trips.
  if (Math.abs(error) > 0.001) {
    console.warn(
      `[world-metrics] weights sum to ${(1 + error).toFixed(3)}, expected 1.000`,
    );
  }
}

export const WORLD_METRICS: WorldMetric[] = INDICATORS.map((metric) => ({
  ...metric,
  progress: normalizeMetric(metric),
}));

/** Tiles per page in the grid. */
export const WORLD_METRICS_PER_PAGE = 4;

const BREAKDOWN = computeBreakdown(INDICATORS);

/**
 * The headline number, 0–1.
 *
 * Computed from `INDICATORS` rather than stored, so a new metric changes this
 * the moment it lands. See `@/lib/scoring` for the model; in short it is a
 * weighted sum of the eleven contributors, minus what the one detractor
 * destroys.
 *
 * Two things are worth keeping apart when reading this against the 27% the
 * previous model showed:
 *
 *   - that number was half geometric mean, half worst-single-score, so CO₂
 *     sitting a hair off its worst recorded level held the whole bar down by
 *     itself;
 *   - this one lets the other eleven indicators outvote it, and charges CO₂ its
 *     full 0.12 weight as a subtraction instead.
 *
 * The result is ~51%. The rise is the method changing, not the world improving.
 */
export const HUMANITY_PROGRESS = BREAKDOWN.score;

/** Every metric's signed share of the headline, biggest mover first. */
export const HUMANITY_CONTRIBUTIONS = BREAKDOWN.contributions;

/** The indicator taking the most off the headline — named on the home screen. */
export const HUMANITY_WEAKEST: WorldMetric =
  WORLD_METRICS.find(
    (metric) => metric.id === BREAKDOWN.contributions.find((entry) => entry.points < 0)?.metric.id,
  ) ??
  // No detractor is dragging: fall back to the contributor furthest from its
  // own target, which is the honest answer to "what's holding this up".
  [...WORLD_METRICS].sort((a, b) => a.progress - b.progress)[0];
