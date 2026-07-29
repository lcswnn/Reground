import { formatMetricValue, type HumanityMetric, type HumanitySeriesPoint } from '@/api/humanity';
import { metricSubject, metricSubjectCapitalized } from '@/constants/world-metrics';
import { todayISO } from '@/lib/format';

/**
 * One indicator, one framing, once a day.
 *
 * The rest of the app answers "where does everything stand"; this answers "here
 * is one thing worth knowing today". Thirteen indicators is not thirteen days of
 * content — it is thirteen *subjects*, and the framing is what makes a subject
 * worth returning to. The same child-mortality series supports "since 1990",
 * "in your lifetime", "the past decade", "the best it has ever been", "it
 * peaked in…", and "on this pace, by…" — six genuinely different things to say
 * about one number, without a word of new data.
 *
 * Everything here is derived from the served artifact and nothing is authored.
 * That is the constraint that makes the feature cheap to run: no daily editorial
 * job, no LLM call, no new table. It is also the constraint that makes it
 * honest — a card cannot claim something the series does not show, because the
 * sentence is assembled from the series.
 *
 * Deliberately a pure module with no React in it: the arithmetic and the grammar
 * are both places this can quietly go wrong, and both are testable here without
 * a simulator.
 */

const MS_PER_DAY = 86_400_000;

/** Below this a comparison is noise wearing a headline's clothes. */
const MIN_CHANGE_PCT = 1;

export type DailyAngleId =
  | 'since-anchor'
  | 'lifetime'
  | 'past-decade'
  | 'record'
  | 'turning-point'
  | 'on-this-pace';

export interface DailyCard {
  /**
   * Stable per day, and changes when the day does. Used as the streak's idea of
   * "which card was engaged with" and as a React key.
   */
  key: string;
  /** Local `YYYY-MM-DD` the card belongs to. */
  date: string;
  metric: HumanityMetric;
  angle: DailyAngleId;
  /** The sentence. One claim, no clauses to spare. */
  headline: string;
  /** The supporting line: where the numbers come from, and what they cost. */
  detail: string;
  /** The earlier end of the comparison, or null for angles without one. */
  from: { value: number; year: string } | null;
  /**
   * The later end. `year` is null when the figure is today's nowcast rather than
   * a measurement, which is what lets the card label it "today" instead of
   * putting a year on a number nobody actually measured.
   */
  to: { value: number; year: string | null };
  /**
   * Whether the movement counts as progress, or null when the artifact predates
   * the `direction` field. Null must render as neither green nor red — see
   * `since-birth.ts`, which makes the same distinction for the same reason.
   */
  isProgress: boolean | null;
  /** Observed values over the angle's own window, oldest first. */
  spark: number[];
}

/** Everything an angle is allowed to know beyond the metric itself. */
interface AngleContext {
  /**
   * How many full passes through the metric list have happened. Angles may use
   * it to vary *within* themselves — see `sinceAnchor`, which walks its anchor
   * years — so the rotation doesn't repeat itself after one lap.
   */
  cycle: number;
  /** `YYYY-MM-DD`, or null when the reader has no birthday on file. */
  birthDate: string | null;
  /** The card's own date, so nothing here reads the clock directly. */
  date: string;
}

/** What an angle produces, before the rotation stamps identity onto it. */
interface AngleResult {
  headline: string;
  detail: string;
  from: { value: number; year: string } | null;
  to: { value: number; year: string | null };
  isProgress: boolean | null;
  spark: number[];
}

interface Angle {
  id: DailyAngleId;
  /** Returns null when this metric's series cannot support this framing. */
  build: (metric: HumanityMetric, context: AngleContext) => AngleResult | null;
}

/**
 * Days since the Unix epoch, in the reader's own calendar.
 *
 * Parsed as UTC after the local date has already been resolved to `YYYY-MM-DD`,
 * which is what keeps the day index from stepping at an hour that isn't
 * midnight — `Date.parse` on a bare local date string is what would reintroduce
 * the timezone bug `toISODate` exists to avoid.
 */
export function dayNumber(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MS_PER_DAY);
}

/** Positive remainder, so a date before 1970 doesn't index backwards. */
function mod(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * The measurements, oldest first, with the nowcast dropped.
 *
 * Every angle that says "on record" or "has never been" means the record of
 * things that were actually measured. Including the projected tail would let a
 * model output set a record, which is the one claim this feature cannot afford
 * to get wrong.
 */
function observedSeries(metric: HumanityMetric): HumanitySeriesPoint[] {
  return metric.series
    .filter((point) => !point.projected)
    .sort((a, b) => a.t.localeCompare(b.t));
}

/**
 * The last measurement at or before a date.
 *
 * The last, not the nearest: a series is a step function of published
 * observations, and reading forward to a point that had not happened yet would
 * credit a year with a number collected after it. Same rule as
 * `since-birth.ts`, on the observed-only series for the reason above.
 */
function observedAt(
  points: HumanitySeriesPoint[],
  isoDate: string,
): { value: number; year: string } | null {
  let found: { value: number; year: string } | null = null;

  for (const point of points) {
    if (point.t > isoDate) break;
    found = { value: point.v, year: point.t.slice(0, 4) };
  }

  return found;
}

/** Observed values from a date onward — the chart for an angle's own window. */
function sparkFrom(points: HumanitySeriesPoint[], isoDate: string): number[] {
  const window = points.filter((point) => point.t >= isoDate).map((point) => point.v);
  // A window with nothing in it would render as no chart at all, which reads as
  // a broken card rather than as a short history. Fall back to the whole series.
  return window.length >= 2 ? window : points.map((point) => point.v);
}

/** `formatMetricValue` against an arbitrary value rather than the nowcast. */
function formatAt(metric: HumanityMetric, value: number): string {
  return formatMetricValue({ ...metric, currentValue: value });
}

export interface Change {
  from: number;
  to: number;
  /** Signed, relative to `from`, as a percentage. */
  pct: number;
  rose: boolean;
  /**
   * The size of the movement on its own, in whichever terms are unambiguous for
   * the unit — "30%", or "2.1 percentage points" for an indicator that is itself
   * a share. For a detail line to slot into a sentence.
   */
  magnitude: string;
  /**
   * The movement with its verb attached — "more than halved", "risen by 34%".
   * Says only which way the number went, never whether that is good news; the
   * caller pairs it with `isProgress` for that.
   */
  phrase: string;
}

/**
 * How to say a change out loud.
 *
 * Rounded phrasing where the ratio earns it and a bare percentage otherwise. A
 * card that says "fallen by 52%" is accurate and forgettable; "more than
 * halved" is the same fact in a form somebody might repeat at dinner. The
 * thresholds are all one-sided — "more than halved" fires at ≤0.5 and never at
 * 0.51 — so no phrase can overstate the series.
 *
 * Returns null when the comparison is meaningless rather than merely small: a
 * zero or negative starting point makes a relative change infinite or
 * backwards. All thirteen indicators are non-negative quantities, so in practice
 * this is the "series starts at zero" guard.
 *
 * `unit` exists for one reason: a relative percentage is ambiguous when the
 * indicator is itself a percentage. Literacy going 85.6% → 87.7% is "up 3%"
 * relatively and "up 2.1 points" absolutely, and a headline that says the former
 * will be read as the latter by everybody. So shares fall back to percentage
 * points, and only the rounded phrases — halving a share is an unambiguous claim
 * either way — stay relative.
 */
export function describeChange(from: number, to: number, unit?: string): Change | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return null;

  const pct = ((to - from) / from) * 100;
  if (Math.abs(pct) < MIN_CHANGE_PCT) return null;

  const rose = to > from;
  const ratio = to / from;
  const rounded = Math.abs(pct).toFixed(0);

  const points = Math.abs(to - from);
  const magnitude =
    unit === '%'
      ? `${points >= 10 ? points.toFixed(0) : points.toFixed(1)} percentage points`
      : `${rounded}%`;
  const plainly = `${rose ? 'risen' : 'fallen'} by ${magnitude}`;

  const phrase = rose
    ? ratio >= 10
      ? 'grown more than tenfold'
      : ratio >= 5
        ? 'grown more than fivefold'
        : ratio >= 3
          ? 'more than tripled'
          : ratio >= 2
            ? 'more than doubled'
            : ratio >= 1.8
              ? 'nearly doubled'
              : plainly
    : ratio <= 0.1
      ? 'fallen by more than 90%'
      : ratio <= 0.25
        ? 'fallen to a quarter of what it was'
        : ratio <= 0.34
          ? 'fallen by two thirds'
          : ratio <= 0.5
            ? 'more than halved'
            : ratio <= 0.56
              ? 'roughly halved'
              : ratio <= 0.7
                ? 'fallen by nearly a third'
                : plainly;

  return { from, to, pct, rose, magnitude, phrase };
}

/**
 * Whether a movement is the good one, or null when the artifact doesn't say.
 *
 * The null case is not defensive padding: `direction` was added to the artifact
 * after the first ones were published, and the app renders whatever is in the
 * bucket. A card that guessed would paint rising life expectancy red.
 */
function progressOf(metric: HumanityMetric, rose: boolean): boolean | null {
  if (!metric.direction) return null;
  return metric.direction === 'higher_is_better' ? rose : !rose;
}

/**
 * Round years worth anchoring a comparison to.
 *
 * Kept to years a reader already has a picture of. Ascending, so the anchor a
 * given cycle picks is stable regardless of what the series turns out to cover.
 */
const ANCHOR_YEARS = [1950, 1970, 1990, 2000, 2010];

/**
 * The minimum gap between an anchor and the last measurement.
 *
 * Fifteen years, so this angle cannot collide with `past-decade` and arrive at
 * the same sentence about the same metric two days running.
 */
const MIN_ANCHOR_SPAN_YEARS = 15;

const sinceAnchor: Angle = {
  id: 'since-anchor',
  build(metric, { cycle, date }) {
    const points = observedSeries(metric);
    const last = points[points.length - 1];
    if (!last) return null;

    const firstYear = Number(points[0].t.slice(0, 4));
    const lastYear = Number(last.t.slice(0, 4));

    const covered = ANCHOR_YEARS.filter(
      (year) => year >= firstYear && year <= lastYear - MIN_ANCHOR_SPAN_YEARS,
    );
    if (covered.length === 0) return null;

    // Walks the covered anchors as the rotation laps, so this angle says
    // something different about the same metric the next time around: "since
    // 1990" one pass, "since 2000" the next.
    const anchorYear = covered[mod(cycle, covered.length)];

    // December rather than January, so a monthly or daily series resolves to a
    // point *within* the anchor year instead of the last one before it.
    const from = observedAt(points, `${anchorYear}-12-31`);
    if (!from) return null;

    const change = describeChange(from.value, metric.currentValue, metric.unit);
    if (!change) return null;

    // To the card's own year, not to the last measurement: the figure being
    // compared is `currentValue`, which is today's nowcast, and a span that
    // stopped at `lastObservedAt` would be describing a different pair of
    // numbers than the ones on screen.
    const span = Number(date.slice(0, 4)) - Number(from.year);

    return {
      headline: `Since ${from.year}, ${metricSubject(metric)} has ${change.phrase}.`,
      // Deliberately not restating the magnitude: the headline already said it,
      // and the card renders both values above this line. What the reader can't
      // see anywhere else is where the number came from and how much of it is
      // measured rather than modelled.
      detail: `${span} years of change, measured by ${metric.sourceName} up to ${lastYear}. Today's figure is projected forward from that measurement.`,
      from,
      to: { value: metric.currentValue, year: null },
      isProgress: progressOf(metric, change.rose),
      spark: sparkFrom(points, `${anchorYear}-01-01`),
    };
  },
};

/** Under this there is not enough lifetime yet for the framing to land. */
const MIN_LIFETIME_YEARS = 5;

const lifetime: Angle = {
  id: 'lifetime',
  build(metric, { birthDate, date }) {
    if (!birthDate) return null;

    const points = observedSeries(metric);
    // Null for someone born before this series began. The honest answer is that
    // the indicator has no lifetime figure for them, not their own first point.
    const from = observedAt(points, birthDate);
    if (!from) return null;

    const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
    if (years < MIN_LIFETIME_YEARS) return null;

    const change = describeChange(from.value, metric.currentValue, metric.unit);
    if (!change) return null;

    return {
      headline: `In your lifetime, ${metricSubject(metric)} has ${change.phrase}.`,
      detail: `${change.rose ? 'Up' : 'Down'} ${change.magnitude} across the ${years} years you have been here. It stood at ${formatAt(metric, from.value)} in ${from.year}.`,
      from,
      to: { value: metric.currentValue, year: null },
      isProgress: progressOf(metric, change.rose),
      spark: sparkFrom(points, birthDate),
    };
  },
};

const pastDecade: Angle = {
  id: 'past-decade',
  build(metric) {
    const points = observedSeries(metric);
    const last = points[points.length - 1];
    if (!last) return null;

    const lastYear = Number(last.t.slice(0, 4));
    const from = observedAt(points, `${lastYear - 10}-12-31`);
    // Not just missing — a `from` that resolved to the same point as `last`
    // would compare a number against itself and report a confident 0%.
    if (!from || from.year === last.t.slice(0, 4)) return null;

    const change = describeChange(from.value, last.v, metric.unit);
    if (!change) return null;

    return {
      headline: `Over the past decade, ${metricSubject(metric)} has ${change.phrase}.`,
      detail: `${formatAt(metric, from.value)} in ${from.year}, ${formatAt(metric, last.v)} in ${last.t.slice(0, 4)}. Ten years is long enough to see it and short enough to remember.`,
      from,
      to: { value: last.v, year: last.t.slice(0, 4) },
      isProgress: progressOf(metric, change.rose),
      spark: sparkFrom(points, `${lastYear - 10}-01-01`),
    };
  },
};

/** Fewer measurements than this and "on record" is not much of a record. */
const MIN_RECORD_POINTS = 10;

const record: Angle = {
  id: 'record',
  build(metric) {
    // Without a direction there is no such thing as a best or worst reading,
    // only a highest and lowest, which is not a card.
    if (!metric.direction) return null;

    const points = observedSeries(metric);
    if (points.length < MIN_RECORD_POINTS) return null;

    const last = points[points.length - 1];
    const values = points.map((point) => point.v);
    const highest = Math.max(...values);
    const lowest = Math.min(...values);

    // Ties count: a series that has equalled its own record is still at it.
    const atHighest = last.v >= highest;
    const atLowest = last.v <= lowest;
    if (!atHighest && !atLowest) return null;

    // A flat series sits at both ends of its own range at once and has nothing
    // to report either way.
    if (atHighest && atLowest) return null;

    const word = atHighest ? 'higher' : 'lower';
    const isProgress = atHighest === (metric.direction === 'higher_is_better');

    return {
      headline: `${metricSubjectCapitalized(metric)} has never been ${word} than it is now.`,
      detail: isProgress
        ? `${points.length} measurements going back to ${points[0].t.slice(0, 4)}, and the latest — ${formatAt(metric, last.v)} in ${last.t.slice(0, 4)} — is the best of them.`
        : `${points.length} measurements going back to ${points[0].t.slice(0, 4)}, and the latest — ${formatAt(metric, last.v)} in ${last.t.slice(0, 4)} — is the worst of them. This is one the world is losing.`,
      from: null,
      to: { value: last.v, year: last.t.slice(0, 4) },
      isProgress,
      spark: values,
    };
  },
};

/** Measurements needed before a peak can be called a peak. */
const MIN_TURNING_POINT_POINTS = 12;
/** How many measurements have to follow the extreme for it to be behind us. */
const MIN_POINTS_AFTER = 3;
/** And how much the number has to have recovered since. */
const MIN_RECOVERY_PCT = 5;

const turningPoint: Angle = {
  id: 'turning-point',
  build(metric) {
    if (!metric.direction) return null;

    const points = observedSeries(metric);
    if (points.length < MIN_TURNING_POINT_POINTS) return null;

    // The extreme in the *bad* direction: the peak for something that should
    // fall, the trough for something that should rise. That is the point the
    // story turns on.
    const worseIsHigher = metric.direction === 'lower_is_better';
    let extremeIndex = 0;
    for (let index = 1; index < points.length; index += 1) {
      const isWorse = worseIsHigher
        ? points[index].v > points[extremeIndex].v
        : points[index].v < points[extremeIndex].v;
      if (isWorse) extremeIndex = index;
    }

    // Still at or near its worst — `record` is the angle for that, and this one
    // would otherwise announce a turning point that hasn't turned.
    if (extremeIndex > points.length - 1 - MIN_POINTS_AFTER) return null;

    const extreme = points[extremeIndex];
    const last = points[points.length - 1];

    const change = describeChange(extreme.v, last.v, metric.unit);
    if (!change) return null;
    // The recovery has to be real, and it has to be in the good direction.
    if (change.rose === worseIsHigher) return null;
    if (Math.abs(change.pct) < MIN_RECOVERY_PCT) return null;

    const extremeYear = extreme.t.slice(0, 4);
    const lastYear = last.t.slice(0, 4);
    const after = points.length - 1 - extremeIndex;

    // Says where the number is now relative to the extreme, not that it has
    // fallen every year since — the scan finds the extreme, it does not check
    // monotonicity, and the stronger sentence would be a claim the data hasn't
    // been asked to support.
    return {
      headline: `${metricSubjectCapitalized(metric)} ${worseIsHigher ? 'peaked' : 'bottomed out'} in ${extremeYear}. It is ${change.magnitude} ${worseIsHigher ? 'lower' : 'higher'} now.`,
      detail: `The worst reading on record was ${formatAt(metric, extreme.v)} in ${extremeYear}. ${after} measurements later, in ${lastYear}, it stands at ${formatAt(metric, last.v)}.`,
      from: { value: extreme.v, year: extremeYear },
      to: { value: last.v, year: lastYear },
      isProgress: true,
      spark: sparkFrom(points, extreme.t),
    };
  },
};

/** A projection shorter than this is a rounding error; longer is science fiction. */
const MIN_PACE_YEARS = 2;
const MAX_PACE_YEARS = 80;

const onThisPace: Angle = {
  id: 'on-this-pace',
  build(metric) {
    const target = metric.targetValue;
    if (target === undefined) return null;

    const points = observedSeries(metric);
    const last = points[points.length - 1];
    if (!last) return null;

    const lastYear = Number(last.t.slice(0, 4));
    const from = observedAt(points, `${lastYear - 10}-12-31`);
    if (!from) return null;

    const span = lastYear - Number(from.year);
    if (span <= 0) return null;

    const perYear = (last.v - from.value) / span;
    const remaining = target - last.v;

    // Already there. A real outcome for a metric at its target, and not this
    // angle's sentence — the projection would divide toward zero.
    if (Math.abs(remaining) < Math.abs(perYear)) return null;
    // Moving away from the target, or not moving. The bad news has its own
    // angles; inventing an arrival year by extrapolating the wrong way would be
    // the one genuinely dishonest thing this file could do.
    if (perYear === 0 || Math.sign(perYear) !== Math.sign(remaining)) return null;

    const years = Math.round(remaining / perYear);
    if (years < MIN_PACE_YEARS || years > MAX_PACE_YEARS) return null;

    return {
      headline: `At the pace of the last decade, ${metricSubject(metric)} reaches ${formatAt(metric, target)} around ${lastYear + years}.`,
      detail: `That is the target this indicator is scored against, ${years} years out at the rate of the ${span} years to ${lastYear}. Trends bend; this arithmetic assumes it doesn't.`,
      from,
      to: { value: last.v, year: String(lastYear) },
      isProgress: true,
      spark: sparkFrom(points, `${lastYear - 10}-01-01`),
    };
  },
};

/**
 * The rotation, in the order a single day advances through on a fallback.
 *
 * Order matters twice: it decides which framing a metric gets on its day, and —
 * because the cycle number picks the starting angle — it decides what the next
 * lap says instead. Change-based angles lead, since they are the ones that
 * always have something to say.
 */
const ANGLES: Angle[] = [sinceAnchor, pastDecade, lifetime, record, turningPoint, onThisPace];

export interface SelectOptions {
  /** Local `YYYY-MM-DD`. Defaults to today. */
  date?: string;
  /** The reader's birthday, which unlocks the `lifetime` angle. */
  birthDate?: string | null;
}

/**
 * Today's card.
 *
 * Deterministic in the date: two devices with the same artifact and the same
 * birthday see the same card, and no state has to be stored anywhere to make
 * that true. It also means the card is *stable* through the day — a refresh
 * cannot reroll it into something else half-read.
 *
 * The rotation is two-dimensional. The day index picks the metric, so
 * consecutive days are always different subjects; the number of completed laps
 * picks the angle, so the second time an indicator comes round it is framed
 * differently. Thirteen metrics and six angles is on the order of seventy-eight
 * distinct cards before anything repeats, and `since-anchor` walks its own
 * anchor years on top of that.
 *
 * Metrics are sorted by id rather than taken in artifact order: the data layer
 * is free to reorder its config, and the reader should not get the same card
 * twice because a config file was tidied.
 *
 * Falls forward rather than showing nothing. Not every angle fits every metric —
 * a series starting in 2005 has no 1990 — so the scan tries the day's angle
 * first, then the rest of the wheel, then moves to the next metric. Only a
 * genuinely empty or degenerate artifact reaches the end and returns null.
 */
export function selectDailyCard(
  metrics: HumanityMetric[],
  options: SelectOptions = {},
): DailyCard | null {
  const date = options.date ?? todayISO();
  const birthDate = options.birthDate ?? null;

  const pool = [...metrics].sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return null;

  const index = dayNumber(date);
  const cycle = Math.floor(index / pool.length);
  const context: AngleContext = { cycle, birthDate, date };

  for (let step = 0; step < pool.length; step += 1) {
    const metric = pool[mod(index + step, pool.length)];

    for (let turn = 0; turn < ANGLES.length; turn += 1) {
      const angle = ANGLES[mod(cycle + turn, ANGLES.length)];
      const result = angle.build(metric, context);
      if (!result) continue;

      return {
        key: `${date}:${metric.id}:${angle.id}`,
        date,
        metric,
        angle: angle.id,
        ...result,
      };
    }
  }

  return null;
}
