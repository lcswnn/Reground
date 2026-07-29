/**
 * How the tracked indicators are named on screen.
 *
 * The indicators themselves no longer live here. They are ingested from OWID,
 * NOAA, and Ember by `data-layer/`, scored server-side, and served as a single
 * JSON artifact that `@/api/humanity` fetches — so this file holds only the
 * things that are genuinely presentation: what a category is called, and how an
 * indicator reads as the subject of a sentence.
 *
 * What used to be here — twelve hand-authored values, hand-authored delta
 * strings, and the aggregation that turned them into one number — is gone
 * deliberately. Every one of those numbers is now measured, every delta is
 * computed from a real series, and the scoring lives in
 * `data-layer/src/scoring/` where it is unit-tested against the model rather
 * than against the UI.
 */

/** Categories the artifact's `category` field can carry. */
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

/**
 * Falls back to the raw key rather than rendering `undefined` if the data layer
 * ever introduces a category the app doesn't know about — a new metric should
 * not be able to blank out a tile's header.
 */
export function categoryLabel(category: string): string {
  return WORLD_CATEGORIES[category as WorldCategory] ?? category;
}

/**
 * Each indicator as the subject of a sentence.
 *
 * The tiles want a short label — "Undernourished", "People online" — because
 * they sit under a category heading and above their own number, where the
 * context is doing half the work. A sentence has no such help: "Since 1990,
 * undernourished has fallen by half" is not English, and "People online has
 * more than doubled" gets the verb wrong.
 *
 * So the daily card gets its own phrasing, keyed by metric id. Every entry is
 * deliberately singular ("the share of…", "the rate of…") so one `has` fits all
 * of them and the angle templates never need to inflect a verb.
 *
 * The ids are the data layer's, but the strings are presentation and belong
 * here rather than in the artifact — how a number reads in a sentence is not a
 * property of the measurement.
 */
const METRIC_SUBJECTS: Record<string, string> = {
  'extreme-poverty': 'the share of people living in extreme poverty',
  'child-mortality': 'the share of children who die before five',
  undernourishment: 'the share of people who are undernourished',
  'adult-literacy': 'the adult literacy rate',
  'life-expectancy': 'life expectancy at birth',
  'renewable-share': "the renewable share of the world's electricity",
  'co2-per-person': 'CO₂ emitted per person',
  'co2-concentration': 'atmospheric CO₂',
  'conflict-deaths': 'the death rate from armed conflict',
  'years-of-schooling': 'average years of schooling',
  'homicide-rate': 'the global homicide rate',
  'internet-access': 'the share of people online',
  'electricity-access': 'the share of people with electricity',
};

/**
 * Sentence-form subject for a metric, falling back to its own lowercased label.
 *
 * The fallback is the reason a fourteenth indicator can ship from the data layer
 * without a matching app release: the sentence reads a little stiffly, but it
 * reads. Silently dropping the metric from the daily rotation instead would be
 * much harder to notice.
 */
export function metricSubject(metric: { id: string; label: string }): string {
  return METRIC_SUBJECTS[metric.id] ?? metric.label.toLowerCase();
}

/** `metricSubject`, capitalized for use at the start of a sentence. */
export function metricSubjectCapitalized(metric: { id: string; label: string }): string {
  const subject = metricSubject(metric);
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}
