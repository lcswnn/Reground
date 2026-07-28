/**
 * Display constants for the "State of the world" grid.
 *
 * The indicators themselves no longer live here. They are ingested from OWID,
 * NOAA, and Ember by `data-layer/`, scored server-side, and served as a single
 * JSON artifact that `@/api/humanity` fetches — so this file holds only the
 * things that are genuinely presentation: what a category is called, and how
 * many tiles fit on a page.
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
 * Tiles per page, as two rows of two.
 *
 * Thirteen indicators page as 4/4/4/1, so the last page carries a single
 * half-width tile. Six per page was tried and only moved the lone tile to a
 * taller page rather than removing it.
 */
export const WORLD_METRICS_PER_PAGE = 4;
