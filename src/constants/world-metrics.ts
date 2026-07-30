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
  | 'basic_needs'
  | 'peace_safety'
  | 'environment'
  | 'education'
  | 'freedom_rights'
  | 'connection';

export const WORLD_CATEGORIES: Record<WorldCategory, string> = {
  health: 'Health',
  basic_needs: 'Basic needs',
  peace_safety: 'Peace & safety',
  environment: 'Environment',
  education: 'Education',
  freedom_rights: 'Freedom & rights',
  connection: 'Connection',
};

/**
 * The seven categories in weight order, heaviest first.
 *
 * Mirrors `CATEGORY_ORDER` in the data layer. Duplicated rather than imported
 * because the data layer is outside the Expo bundle and has its own module
 * resolution — the same reason the artifact types in `@/api/humanity` are
 * hand-written rather than shared.
 */
export const WORLD_CATEGORY_ORDER: WorldCategory[] = [
  'health',
  'basic_needs',
  'peace_safety',
  'environment',
  'education',
  'freedom_rights',
  'connection',
];

/**
 * One-line framing for each category, shown under its slider.
 *
 * Present tense and plain: the weighting screen asks someone to decide how much
 * a category matters to them, and "Peace, safety and the rule of law" is a
 * better prompt for that than the bare word "Safety".
 */
export const CATEGORY_BLURBS: Record<WorldCategory, string> = {
  health: 'Whether people survive childhood, childbirth, and preventable disease.',
  basic_needs: 'Whether people have enough to eat and enough to live on.',
  peace_safety: 'Whether people are safe from violence, conflict, and each other.',
  environment: 'Whether the planet stays liveable for the people on it.',
  education: 'Whether people can read, and how long they stay in school.',
  freedom_rights: 'Whether people are free, counted, and able to stay home.',
  connection: 'Whether people have power, internet, and the means to reach each other.',
};

/**
 * Category ids used before the seven-category framework replaced them.
 *
 * The app reads whatever artifact is currently in the bucket, and an artifact
 * built before this change carries the old ids. Without this map those tiles
 * would render a raw `poverty` or `access` as their header until the next
 * publish — technically the documented fallback behaviour, but avoidable, and
 * the window is exactly when someone is most likely to be looking.
 *
 * Safe to delete once no deployed client can encounter a pre-framework artifact.
 */
const LEGACY_CATEGORIES: Record<string, WorldCategory> = {
  poverty: 'basic_needs',
  safety: 'peace_safety',
  access: 'connection',
  technology: 'connection',
  rights: 'freedom_rights',
};

/** Maps a possibly-legacy category id onto the current set. */
export function normalizeCategory(category: string): string {
  return LEGACY_CATEGORIES[category] ?? category;
}

/**
 * Falls back to the raw key rather than rendering `undefined` if the data layer
 * ever introduces a category the app doesn't know about — a new metric should
 * not be able to blank out a tile's header.
 */
export function categoryLabel(category: string): string {
  const current = normalizeCategory(category);
  return WORLD_CATEGORIES[current as WorldCategory] ?? current;
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
  'maternal-mortality': 'the rate of mothers dying in childbirth',
  'vaccination-coverage': 'the share of children fully vaccinated',
  'solar-price': 'the price of a watt of solar power',
  'arctic-sea-ice': 'the extent of Arctic sea ice',
  'forced-displacement': 'the number of people forced from their homes',
  'disease-outbreaks': 'the number of outbreaks WHO reports each year',
  // Not yet scored — see PENDING_METRICS in the data layer. Listed here so the
  // sentence reads correctly the day one of them is promoted, rather than
  // falling back to a lowercased tile label mid-sentence.
  'conflict-fatalities': 'the number of people killed in conflict each week',
  'grid-carbon-intensity': 'the carbon intensity of the electricity grid',
  'deforestation-alerts': 'the area of forest under deforestation alert',
  'press-freedom': 'the state of press freedom worldwide',
  'democracy-index': 'the share of people living under liberal democracy',
  'internet-shutdowns': 'the number of deliberate internet shutdowns',
  'modern-slavery': 'the prevalence of modern slavery',
  'food-insecurity': 'the number of countries in acute food crisis',
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
