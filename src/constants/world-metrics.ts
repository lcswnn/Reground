/**
 * Headline indicators for the "State of the world" grid.
 *
 * Every number here is a hand-authored placeholder so the layout, paging, and
 * fill animation can be built before the data pipeline exists. Nothing in this
 * file is sourced — replace it wholesale once metrics come from the API.
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

export interface WorldMetric {
  id: string;
  category: WorldCategory;
  label: string;
  /** Pre-formatted for display — no unit math happens on this yet. */
  value: string;
  /**
   * 0–1: how far along the good end of its own scale this sits. Authored per
   * metric rather than derived, so bars stay comparable whether the underlying
   * number is meant to rise (literacy) or fall (child mortality).
   */
  progress: number;
  /** Movement since the comparison year. */
  delta: string;
  /** False when the trend runs the wrong way, which recolors the tile. */
  isProgress: boolean;
}

export const WORLD_METRICS: WorldMetric[] = [
  {
    id: 'child-mortality',
    category: 'health',
    label: 'Child mortality before 5',
    value: '3.6%',
    progress: 0.9,
    delta: '↓ 61% since 1990',
    isProgress: true,
  },
  {
    id: 'life-expectancy',
    category: 'health',
    label: 'Life expectancy',
    value: '73.4 yrs',
    progress: 0.78,
    delta: '↑ 9 yrs since 1990',
    isProgress: true,
  },
  {
    id: 'extreme-poverty',
    category: 'poverty',
    label: 'Living in extreme poverty',
    value: '8.5%',
    progress: 0.85,
    delta: '↓ 28 pts since 1990',
    isProgress: true,
  },
  {
    id: 'undernourishment',
    category: 'poverty',
    label: 'Undernourished',
    value: '9.1%',
    progress: 0.72,
    delta: '↓ 10 pts since 1990',
    isProgress: true,
  },
  {
    id: 'renewable-share',
    category: 'environment',
    label: 'Electricity from renewables',
    value: '30%',
    progress: 0.3,
    delta: '↑ 11 pts since 2000',
    isProgress: true,
  },
  {
    id: 'co2-per-person',
    category: 'environment',
    label: 'CO₂ per person',
    value: '4.7 t',
    progress: 0.35,
    delta: '↑ 0.3 t since 2000',
    isProgress: false,
  },
  {
    id: 'homicide-rate',
    category: 'safety',
    label: 'Homicide rate',
    value: '5.8 /100k',
    progress: 0.68,
    delta: '↓ 1.4 since 1993',
    isProgress: true,
  },
  {
    id: 'conflict-deaths',
    category: 'safety',
    label: 'Deaths in conflict',
    value: '0.6 /100k',
    progress: 0.82,
    delta: '↓ 88% since 1950',
    isProgress: true,
  },
  {
    id: 'internet-access',
    category: 'access',
    label: 'People online',
    value: '68%',
    progress: 0.68,
    delta: '↑ 41 pts since 2005',
    isProgress: true,
  },
  {
    id: 'mobile-coverage',
    category: 'access',
    label: 'Mobile network coverage',
    value: '95%',
    progress: 0.95,
    delta: '↑ 22 pts since 2005',
    isProgress: true,
  },
  {
    id: 'adult-literacy',
    category: 'education',
    label: 'Adult literacy',
    value: '87%',
    progress: 0.87,
    delta: '↑ 19 pts since 1980',
    isProgress: true,
  },
  {
    id: 'girls-in-school',
    category: 'education',
    label: 'Girls in primary school',
    value: '90%',
    progress: 0.9,
    delta: '↑ 14 pts since 1990',
    isProgress: true,
  },
];

/** Tiles per page in the grid. */
export const WORLD_METRICS_PER_PAGE = 4;

/**
 * The single headline number: every indicator's own progress, averaged.
 *
 * Derived rather than authored, so adding a metric above moves the bar on the
 * home screen with no second place to update. Unweighted on purpose — this is a
 * mood, not an index, and any weighting would be a claim we can't source.
 * Indicators moving the wrong way (CO₂ per person) are included at their real
 * position and pull it down, which is the point of averaging them at all.
 */
export const HUMANITY_PROGRESS =
  WORLD_METRICS.reduce((total, metric) => total + metric.progress, 0) /
  Math.max(1, WORLD_METRICS.length);
