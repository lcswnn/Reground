/**
 * Bounds for every birthday picker in the app.
 *
 * The far end is a plausible human lifespan rather than a round number, and the
 * near end is today — "since you were born" needs a date that has happened.
 * `supabase/add-birthday.sql` enforces the same range in the database.
 */

const OLDEST_YEARS = 120;

export const LATEST_BIRTHDAY = new Date();

export const EARLIEST_BIRTHDAY = new Date(
  LATEST_BIRTHDAY.getFullYear() - OLDEST_YEARS,
  LATEST_BIRTHDAY.getMonth(),
  LATEST_BIRTHDAY.getDate(),
);
