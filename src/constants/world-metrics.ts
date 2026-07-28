/**
 * Headline indicators for the "State of the world" grid.
 *
 * The current values are still hand-authored placeholders — nothing in this file
 * comes from a feed yet, and it should be replaced wholesale once one exists.
 * What is no longer authored is each metric's *score*. Every tile now declares
 * the two ends of its own scale:
 *
 *   floor  — the 0% anchor: the worst state we're measuring against, generally
 *            the level at the comparison year in `delta`.
 *   target — the 100% anchor: the point at which this counts as solved.
 *
 * and the bar is derived from where `current` sits between them. Where the SDGs
 * state a number, `basis` cites it; where they only say "substantially reduce",
 * the threshold is a judgment call and `basis` says so, so it can be argued with
 * rather than mistaken for a source.
 *
 * Direction is implicit: child mortality runs floor 9.3 → target 2.5, literacy
 * runs 68 → 100, and the same subtraction scores both.
 */

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

interface WorldMetricInput {
  id: string;
  category: WorldCategory;
  label: string;
  /** Pre-formatted for display. */
  value: string;
  /** The same figure as `value`, as a number, in the units `floor`/`target` use. */
  current: number;
  /** The 0% anchor: the worst state being measured against. */
  floor: number;
  /** The 100% anchor: the level at which this indicator is done. */
  target: number;
  /** Where the anchors come from — an SDG number, or an admission that it's a call. */
  basis: string;
  /** Movement since the comparison year. */
  delta: string;
  /** False when the trend runs the wrong way, which recolors the tile. */
  isProgress: boolean;
}

export interface WorldMetric extends WorldMetricInput {
  /** 0–1, derived from `current` against `floor` and `target`. */
  progress: number;
}

/**
 * No score is allowed to reach a true zero.
 *
 * The geometric mean below multiplies these together, so a single 0 would
 * annihilate the index no matter how the other eleven are doing — which is a
 * stronger claim than "we are failing badly at one thing". The `min` term is
 * what's meant to carry that weight, and it does so without the cliff.
 */
const SCORE_FLOOR = 0.01;

const INDICATORS: WorldMetricInput[] = [
  {
    id: 'child-mortality',
    category: 'health',
    label: 'Child mortality before 5',
    value: '3.6%',
    current: 3.6,
    floor: 9.3,
    target: 2.5,
    basis: 'SDG 3.2: under-5 mortality at or below 25 per 1,000 live births. Floor is the 1990 rate.',
    delta: '↓ 61% since 1990',
    isProgress: true,
  },
  {
    id: 'life-expectancy',
    category: 'health',
    label: 'Life expectancy',
    value: '73.4 yrs',
    current: 73.4,
    floor: 46,
    target: 80,
    basis: 'No SDG figure. Target is roughly what the longest-lived countries already reach; floor is the 1950 global average.',
    delta: '↑ 9 yrs since 1990',
    isProgress: true,
  },
  {
    id: 'extreme-poverty',
    category: 'poverty',
    label: 'Living in extreme poverty',
    value: '8.5%',
    current: 8.5,
    floor: 38,
    target: 0,
    basis: 'SDG 1.1: eradicate extreme poverty for all people everywhere. Floor is the 1990 share.',
    delta: '↓ 28 pts since 1990',
    isProgress: true,
  },
  {
    id: 'undernourishment',
    category: 'poverty',
    label: 'Undernourished',
    value: '9.1%',
    current: 9.1,
    floor: 19,
    target: 0,
    basis: 'SDG 2.1: end hunger and ensure access to sufficient food year-round. Floor is the 1990–92 share.',
    delta: '↓ 10 pts since 1990',
    isProgress: true,
  },
  {
    id: 'renewable-share',
    category: 'environment',
    label: 'Electricity from renewables',
    value: '30%',
    current: 30,
    floor: 19,
    target: 100,
    basis: 'No SDG figure (7.2 says only "substantially increase"). Target is fully decarbonized electricity; floor is the 2000 share.',
    delta: '↑ 11 pts since 2000',
    isProgress: true,
  },
  {
    id: 'co2-per-person',
    category: 'environment',
    label: 'CO₂ per person',
    value: '4.7 t',
    current: 4.7,
    floor: 4.9,
    target: 2.0,
    basis: 'No SDG figure. Target is the per-capita level broadly consistent with 1.5°C; floor is the recent peak, which is why this scores near zero.',
    delta: '↑ 0.3 t since 2000',
    isProgress: false,
  },
  {
    id: 'homicide-rate',
    category: 'safety',
    label: 'Homicide rate',
    value: '5.8 /100k',
    current: 5.8,
    floor: 7.4,
    target: 2.0,
    basis: 'No SDG figure (16.1 says "significantly reduce"). Target is roughly the rate in the safest third of countries; floor is the 1993 peak.',
    delta: '↓ 1.4 since 1993',
    isProgress: true,
  },
  {
    id: 'conflict-deaths',
    category: 'safety',
    label: 'Deaths in conflict',
    value: '0.6 /100k',
    current: 0.6,
    floor: 4.0,
    target: 0,
    basis: 'No SDG figure (16.1). Target is zero; floor is the mid-century post-war peak.',
    delta: '↓ 88% since 1950',
    isProgress: true,
  },
  {
    id: 'internet-access',
    category: 'access',
    label: 'People online',
    value: '68%',
    current: 68,
    floor: 16,
    target: 100,
    basis: 'SDG 9.c: universal and affordable access. Floor is the 2005 share.',
    delta: '↑ 41 pts since 2005',
    isProgress: true,
  },
  {
    id: 'mobile-coverage',
    category: 'access',
    label: 'Mobile network coverage',
    value: '95%',
    current: 95,
    floor: 73,
    target: 100,
    basis: 'SDG 9.c: universal access. Floor is the 2005 share of population covered.',
    delta: '↑ 22 pts since 2005',
    isProgress: true,
  },
  {
    id: 'adult-literacy',
    category: 'education',
    label: 'Adult literacy',
    value: '87%',
    current: 87,
    floor: 68,
    target: 100,
    basis: 'SDG 4.6: all youth and most adults literate and numerate. Floor is the 1980 rate.',
    delta: '↑ 19 pts since 1980',
    isProgress: true,
  },
  {
    id: 'girls-in-school',
    category: 'education',
    label: 'Girls in primary school',
    value: '90%',
    current: 90,
    floor: 76,
    target: 100,
    basis: 'SDG 4.1: all girls and boys complete primary education. Floor is the 1990 rate.',
    delta: '↑ 14 pts since 1990',
    isProgress: true,
  },
];

/**
 * Where `current` sits between the two anchors, clamped to [SCORE_FLOOR, 1].
 *
 * The subtraction handles both directions on its own: when a metric is meant to
 * fall, `target - floor` is negative and so is `current - floor`, and the ratio
 * comes out the right way up. Overshooting the target caps at 1 rather than
 * banking credit — a solved indicator is solved, and letting one run past 100%
 * would let it pay for another's failure, which is the whole thing this
 * aggregation is trying not to do.
 */
function scoreOf(metric: WorldMetricInput): number {
  const span = metric.target - metric.floor;
  if (span === 0) return SCORE_FLOOR;
  const raw = (metric.current - metric.floor) / span;
  return Math.min(1, Math.max(SCORE_FLOOR, raw));
}

export const WORLD_METRICS: WorldMetric[] = INDICATORS.map((metric) => ({
  ...metric,
  progress: scoreOf(metric),
}));

/** Tiles per page in the grid. */
export const WORLD_METRICS_PER_PAGE = 4;

/** How much of the headline number the worst indicator alone accounts for. */
const MIN_WEIGHT = 0.5;

const SCORES = WORLD_METRICS.map((metric) => metric.progress);

/**
 * Geometric rather than arithmetic: the mean of the logs, so a score near zero
 * drags the whole number down instead of being averaged away by eleven healthy
 * ones. Doubling one indicator from 0.4 to 0.8 moves this as much as doubling
 * any other, which an arithmetic mean does not do.
 */
const GEOMETRIC_MEAN = Math.exp(
  SCORES.reduce((total, score) => total + Math.log(score), 0) / SCORES.length,
);

const WORST_SCORE = Math.min(...SCORES);

/**
 * The headline number: half the geometric mean, half the worst score.
 *
 * An arithmetic mean answers "how are things on average", which lets eleven
 * good indicators bury one catastrophe. This answers something closer to "how
 * are we doing, all things considered" — and the `min` term means the bar
 * cannot get far past the single thing we are failing worst at, no matter how
 * many indicators are added above it.
 *
 * Two changes stack here, and it's worth keeping them apart when reading the
 * drop from the 73% this used to show:
 *
 *   - re-deriving the scores against real anchors takes the arithmetic mean
 *     from 73% to 57%, because several indicators were authored more
 *     generously than their distance to a stated target justifies;
 *   - switching to this blend takes it from 57% to 27%.
 *
 * The second number is held there almost entirely by CO₂ per person, which sits
 * a hair off its own worst recorded level. That is the method working, not a
 * bug in the numbers.
 */
export const HUMANITY_PROGRESS = MIN_WEIGHT * WORST_SCORE + (1 - MIN_WEIGHT) * GEOMETRIC_MEAN;

/** The indicator holding the number down — named on the home screen. */
export const HUMANITY_WEAKEST: WorldMetric =
  WORLD_METRICS.find((metric) => metric.progress === WORST_SCORE) ?? WORLD_METRICS[0];
