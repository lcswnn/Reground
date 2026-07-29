import type { StoryCategory } from './types.js';

/**
 * The category set, as an array the JSON schema can use as an `enum`.
 *
 * Restated here rather than imported from `src/constants/categories.ts`,
 * which is app code behind the `@/` path alias that `tsx` does not resolve.
 * The duplication is guarded below, so it cannot drift silently.
 */
export const CATEGORY_VALUES = [
  'health',
  'poverty',
  'climate',
  'energy',
  'education',
  'science',
  'rights',
  'conservation',
] as const satisfies readonly StoryCategory[];

/**
 * Compile-time exhaustiveness check.
 *
 * `satisfies` above catches a value that isn't a real category; this catches a
 * real category that is missing from the list. Without it, adding a ninth
 * category to `StoryCategory` would leave the curator unable to ever assign it,
 * with nothing failing to say so.
 */
type AssertNever<T extends never> = T;
type _AllCategoriesListed = AssertNever<Exclude<StoryCategory, (typeof CATEGORY_VALUES)[number]>>;
