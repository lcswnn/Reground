import { validateMetricConfigs } from '../scoring/normalize.js';
import type { MetricConfig, MetricDirection } from '../types.js';

/**
 * The scored indicators, with anchors re-derived from the real series rather
 * than from the hand-authored constants they replace.
 *
 * Every `baselineValue` below is an actual observation at the stated year,
 * pulled by `jobs/anchors.ts`, unless its `basis` says otherwise — four of the
 * newer metrics have editorial baselines because their series has no year that
 * works as an anchor, and each of those says so outright. Targets remain
 * editorial throughout: where an SDG states a number it is cited, and where it
 * does not, `basis` says so.
 *
 * ## Weights, by category
 *
 * Weights are allocated to a category first and divided within it second, which
 * is the only way the balance stays legible as metrics are added. The category
 * totals are the editorial statement; the splits inside them are detail.
 *
 * The seven categories and their default weights come from a reading of the
 * OECD Better Life Index, the UN SDGs, Doughnut Economics and Bhutan's Gross
 * National Happiness Index — see `SCORING.md` at the repo root for the framework
 * and the reasoning:
 *
 *   health 0.20 · basic_needs 0.18 · peace_safety 0.15 · environment 0.15
 *   · education 0.14 · freedom_rights 0.10 · connection 0.08
 *
 * These are the *defaults*. The app lets a reader reweight the categories to
 * their own priorities and recomputes the composite live; `src/lib/scoring.ts`
 * mirrors the maths below for that purpose. The defaults are what the headline
 * "Humanity Score" uses and what someone gets back when they hit reset.
 *
 * `freedom_rights` is carrying 0.10 on a single indicator, which is more weight
 * per series than anywhere else in the set. That is deliberate and temporary:
 * the category is sized for the four metrics meant to land in it — press
 * freedom, democracy, internet shutdowns, modern slavery, all sitting in
 * `PENDING_METRICS` — rather than for the displacement series alone. Until they
 * arrive, read that 10% as one number doing four numbers' work.
 *
 * These are judgements, not derivations, and they are the numbers most worth
 * arguing with in this file.
 *
 * ## Metrics that are not here
 *
 * Two from the original twelve are gone from *scoring*. Mobile network coverage
 * has no world-level series anywhere in OWID — the nearest is mobile
 * *subscriptions*, which reads 111 per 100 people and cannot be normalised
 * against a 100% target. Girls in primary school likewise has no world
 * aggregate. Both were swapped for the nearest clean series (electricity access
 * and mean years of schooling) and both are recorded in `UNSOURCED_METRICS`
 * below so the gap stays visible rather than being quietly forgotten.
 *
 * Eight more are built but unscored, in `PENDING_METRICS`: three need an API key
 * before they have any history to anchor on, and five run on the seeded-CSV path
 * and need their file populated. See `adapters/seeded.ts`.
 */
export const METRICS: MetricConfig[] = [
  {
    id: 'extreme-poverty',
    label: 'Living in extreme poverty',
    category: 'basic_needs',
    baselineValue: 43.414,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.10,
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
    weight: 0.07,
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
    category: 'basic_needs',
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
    weight: 0.06,
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
    weight: 0.04,
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
    weight: 0.04,
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
    weight: 0.04,
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
    category: 'peace_safety',
    baselineValue: 1.302,
    targetValue: 0,
    direction: 'lower_is_better',
    weight: 0.08,
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
    category: 'peace_safety',
    baselineValue: 6.898,
    targetValue: 2.0,
    direction: 'lower_is_better',
    weight: 0.07,
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
    category: 'connection',
    baselineValue: 15.6,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.03,
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
    category: 'connection',
    baselineValue: 78.225,
    targetValue: 100,
    direction: 'higher_is_better',
    weight: 0.03,
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
    weight: 0.05,
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
    weight: 0.02,
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
    category: 'connection',
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
    weight: 0.02,
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
  {
    id: 'arctic-sea-ice',
    label: 'Arctic sea ice',
    category: 'environment',
    // The anchors are the two ends of "how much ice a normal year has". Target
    // is the real 1981-2010 climatological mean of the stored series (11.63),
    // the standard reference period. Baseline is 10.0, which is editorial: it is
    // the record-low annual mean, rounded, and it is a stated floor rather than
    // an observation at a chosen year.
    //
    // Anchoring at the *start* of the record the way co2-concentration does
    // would not work here. The first year is the healthiest, so a 1979 baseline
    // with any target above it puts today far past the -0.5 floor, where the
    // metric pins and stops responding — the same failure mode solar-price has
    // in the opposite direction. Anchoring across the modern range instead
    // leaves it able to move, which is the whole reason to track it.
    baselineValue: 10.0,
    targetValue: 11.628,
    direction: 'higher_is_better',
    weight: 0.03,
    // Ice is being lost, so this subtracts, like the two CO₂ metrics.
    polarity: 'detractor',
    nowcastMethod: 'linear',
    // Thirty, and the length matters more here than anywhere else in this file.
    //
    // `nowcast` returns the fitted line's value at today, not the last
    // observation carried forward along a slope. On this series every window
    // from 8 to 20 years therefore projects *upward* — 10.28 for a 15-year
    // window against a last observation of 10.11 — because the ice stepped down
    // around 2016 and a medium-length line averages through that step, leaving
    // its right-hand end above every observation of the last two years. The tile
    // would have shown Arctic ice recovering, off a correctly falling slope.
    //
    // Thirty years spans the whole modern decline, fits it well (confidence
    // 0.85, the highest of any window tried) and projects downward, which is
    // both the honest reading and the one the underlying trend supports.
    trailingWindowYears: 30,
    sourceAdapterId: 'nsidc:sea-ice-index-north',
    unit: 'M km²',
    basis:
      'Arctic sea ice extent, stored as a centred 365-day mean so the annual freeze-thaw cycle does not read as the world improving every winter. Target is the 1981-2010 climatological mean (11.63M km²); baseline is 10.0M km², the record-low annual mean. Currently 10.11 — essentially at the worst level in the satellite record, which is why this scores near zero rather than negative. Antarctic ice is tracked separately by NSIDC and is deliberately not averaged in: the hemispheres are six months out of phase and their trends differ.',
  },
  {
    id: 'forced-displacement',
    label: 'Forcibly displaced',
    category: 'freedom_rights',
    // Editorial, and for the same reason as sea ice: the 1993 level (21.3M) as
    // baseline puts today's 101.7M at roughly -4, four times past the floor,
    // where the metric would be pinned permanently and could never register
    // improvement. Baseline is 100M — the plateau displacement has sat on since
    // 2023 — and target is the real 1993 value, the first year all three
    // components were counted. So the metric reads "against the modern crisis
    // level, moving toward where the record began".
    baselineValue: 100,
    targetValue: 21.267,
    direction: 'lower_is_better',
    weight: 0.10,
    polarity: 'detractor',
    nowcastMethod: 'linear',
    // Twenty. 2025 came in at 101.7 against 2024's 107.4 — the first fall in a
    // decade — and a 5-to-15-year window fits a line straight over that dip and
    // projects 116-119 for today, fifteen million people above the last real
    // measurement. Twenty years spans the full rise from the 2005 trough,
    // projects 109, and carries the highest confidence of any window tried.
    trailingWindowYears: 20,
    sourceAdapterId: 'unhcr:population',
    unit: 'M people',
    basis:
      'Refugees, asylum-seekers and internally displaced people worldwide, from UNHCR. Deliberately not UNHCR\'s headline "forcibly displaced" figure, which also folds in UNRWA Palestine refugees and two categories whose definitions have changed since 2023 — this narrower total is smaller but comparable across years. Series starts in 1993, the first year IDPs and asylum-seekers were counted at all; before that the API returns literal zeros that would fake a jump.',
  },
  {
    id: 'disease-outbreaks',
    label: 'WHO outbreak reports',
    category: 'health',
    baselineValue: 206,
    targetValue: 0,
    direction: 'lower_is_better',
    // Zero, on purpose. This is charted and visible but does not move the score.
    //
    // The series counts reports WHO chose to publish, and its decline from 206
    // in 2014 to 52 in 2024 is substantially WHO consolidating many short
    // updates into fewer long ones — an editorial change at the publisher, not
    // the world getting healthier. Weighting it would let a style guide push a
    // progress score upward, which is exactly the kind of laundering the rest of
    // this file is built to avoid.
    //
    // It earns its place as context next to the outcome metrics, which all lag
    // by years. If a severity-weighted or outbreak-level series becomes
    // available, revisit the weight then — not before.
    weight: 0,
    polarity: 'contributor',
    nowcastMethod: 'linear',
    // Five, and short on purpose. The projection for today swings from 19 to 80
    // depending only on the window length — 3y says 19, 10y says 26, 30y says
    // 80. A series whose extrapolation is entirely an artefact of how far back
    // you look has no trend worth projecting, which is the clearest evidence yet
    // that the zero weight above is right. A short window keeps the displayed
    // number near the last real count rather than inventing a slope.
    trailingWindowYears: 5,
    sourceAdapterId: 'who:disease-outbreak-news',
    unit: 'reports',
    basis:
      'Disease Outbreak News items published by WHO per year, 1996-present. An early-warning signal rather than an outcome: every other health metric here lags by years, and this moves now. Counts reports, not outbreaks or their severity — one imported measles case and an Ebola epidemic are one item each. Shown for context and deliberately given zero weight in the score, because its trend tracks WHO\'s reporting practice at least as strongly as it tracks the world.',
  },
];

/**
 * Anchors checked at import, for the same reason the weight sums are.
 *
 * A contradiction between `direction` and the anchors, a zero span or a
 * non-finite anchor makes a metric unscoreable. Caught here it is a loud failure
 * naming every offender; caught at scoring time it disappears into
 * `safeScoreAt` and reads as a missing delta. See `validateMetricConfigs`.
 */
validateMetricConfigs(METRICS);

/** Thrown at import time rather than silently mis-scoring. */
const weightSum = METRICS.reduce((total, metric) => total + metric.weight, 0);
if (Math.abs(weightSum - 1) > 0.001) {
  throw new Error(`Metric weights sum to ${weightSum.toFixed(3)}, expected 1.000`);
}

/**
 * Category totals, checked at import for the same reason as the sum above.
 *
 * The weights in this file are allocated per category and split within it, so a
 * plausible-looking edit to one metric can quietly rebalance a whole category
 * while still totalling 1.00. This catches that.
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  health: 0.2,
  basic_needs: 0.18,
  peace_safety: 0.15,
  environment: 0.15,
  education: 0.14,
  freedom_rights: 0.1,
  connection: 0.08,
};

/**
 * Display order for the seven categories, most heavily weighted first.
 *
 * Exported so the app's weighting screen and the artifact agree on sequence
 * without either hardcoding it — `Object.keys` order on `CATEGORY_WEIGHTS`
 * happens to match today, but relying on object key order to drive a UI is the
 * kind of thing that breaks silently in a refactor.
 */
export const CATEGORY_ORDER = [
  'health',
  'basic_needs',
  'peace_safety',
  'environment',
  'education',
  'freedom_rights',
  'connection',
] as const;

for (const [category, expected] of Object.entries(CATEGORY_WEIGHTS)) {
  const actual = METRICS.filter((metric) => metric.category === category).reduce(
    (total, metric) => total + metric.weight,
    0,
  );
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(
      `Category "${category}" weights sum to ${actual.toFixed(3)}, expected ${expected.toFixed(2)}`,
    );
  }
}

/**
 * Built, but not scored — each is waiting on something before it can be trusted.
 *
 * They are exported so `jobs/backfill.ts` and `jobs/anchors.ts` can be pointed
 * at them to accumulate history and derive real baselines, which is precisely
 * what most of them are missing. Nothing reads this array during scoring.
 *
 * Two reasons a metric is here:
 *
 * **No key, so no data, so no honest anchors.** `conflict-fatalities`,
 * `grid-carbon-intensity` and `deforestation-alerts` have working adapters and
 * verified endpoints, but ACLED, Electricity Maps and GFW all require
 * credentials that were not available when they were written. Every
 * `baselineValue` in the scored set above is a real observation; inventing one
 * from a plausible-sounding guess would break that contract silently. Set the
 * key, run `data:backfill`, run `data:anchors`, then promote.
 *
 * **No feed, so a human has to type it in.** `press-freedom`,
 * `democracy-index`, `internet-shutdowns`, `modern-slavery` and
 * `food-insecurity` publish annual PDFs and web pages, not APIs. Their adapters
 * read checked-in CSVs under `data-layer/data/`, each of which currently has a
 * header, a documented update procedure, and no rows. Populate the file, derive
 * anchors from it, then promote.
 *
 * Promoting any of these means taking weight from the categories above — the
 * category check will fail loudly until you do.
 */
export const PENDING_METRICS: Omit<MetricConfig, 'baselineValue' | 'targetValue' | 'weight'>[] = [
  {
    id: 'conflict-fatalities',
    label: 'Conflict deaths this week',
    category: 'peace_safety',
    direction: 'lower_is_better',
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'acled:weekly-fatalities',
    unit: 'deaths/wk',
    basis:
      'Weekly world fatalities from political violence, ACLED. Supplements conflict-deaths (UCDP, annual, per-100k, back to 1989) rather than replacing it: that one is the long-run anchor and is published a year in arrears, this one moves while a war is happening. Needs ACLED_USERNAME / ACLED_PASSWORD. Check ACLED\'s redistribution terms before this reaches a public artifact.',
  },
  {
    id: 'grid-carbon-intensity',
    label: 'Grid carbon intensity',
    category: 'environment',
    direction: 'lower_is_better',
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'electricitymaps:carbon-intensity',
    unit: 'gCO₂/kWh',
    basis:
      'Grams of CO₂ per kWh consumed — the outcome that renewable-share is only one input to, since a grid can add renewables and hold emissions flat if demand grows. Needs ELECTRICITY_MAPS_API_KEY. Note that the free tier grants one zone and there is no world aggregate at any tier, so this measures a single named grid (default DE) and must be labelled as a sample, not as the world.',
  },
  {
    id: 'deforestation-alerts',
    label: 'Deforestation alerts',
    category: 'environment',
    direction: 'lower_is_better',
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'gfw:integrated-alerts',
    unit: 'k ha/wk',
    basis:
      'Weekly area under high-confidence GLAD+RADD integrated alerts, Global Forest Watch. Needs GFW_API_KEY. Alert area is not deforested area — it includes natural disturbance and some plantation harvest, and detection sensitivity has grown over time — so this is good for direction over a few years and for being current, not for long-run level claims.',
  },
  {
    id: 'press-freedom',
    label: 'Press freedom',
    category: 'freedom_rights',
    direction: 'higher_is_better',
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'seed:press-freedom',
    unit: 'score',
    basis:
      'RSF World Press Freedom Index global score, 0-100. Manual annual entry. Series can only start at 2022 — RSF replaced its methodology that year and scores either side are not comparable.',
  },
  {
    id: 'democracy-index',
    label: 'Liberal democracy',
    category: 'freedom_rights',
    direction: 'higher_is_better',
    polarity: 'contributor',
    nowcastMethod: 'linear',
    trailingWindowYears: 15,
    sourceAdapterId: 'seed:democracy',
    unit: 'index',
    basis:
      'V-Dem Liberal Democracy Index, population-weighted world average, 0-1. Manual annual entry. Use the population-weighted series consistently — it and the country-average series diverge sharply, and mixing them across years manufactures a trend.',
  },
  {
    id: 'internet-shutdowns',
    label: 'Internet shutdowns',
    category: 'freedom_rights',
    direction: 'lower_is_better',
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'seed:internet-shutdowns',
    unit: 'shutdowns',
    basis:
      'Documented deliberate internet shutdowns per year, Access Now #KeepItOn. Distinct from internet-access and electricity-access, which measure whether infrastructure exists; this measures it being switched off on purpose. Counts documented events, so partly reflects monitoring capacity.',
  },
  {
    id: 'modern-slavery',
    label: 'Modern slavery',
    category: 'freedom_rights',
    direction: 'lower_is_better',
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 20,
    sourceAdapterId: 'seed:modern-slavery',
    unit: '/1k',
    basis:
      'People in modern slavery per 1,000 population, Walk Free Global Slavery Index. Editions are roughly five years apart and Walk Free states explicitly that they should not be compared across methodology changes — so this is a few non-comparable points, not a series. Consider leaving it at weight 0 permanently.',
  },
  {
    id: 'food-insecurity',
    label: 'Countries in food crisis',
    category: 'basic_needs',
    direction: 'lower_is_better',
    polarity: 'detractor',
    nowcastMethod: 'linear',
    trailingWindowYears: 5,
    sourceAdapterId: 'seed:food-insecurity',
    unit: 'countries',
    basis:
      'Countries with a population in IPC/CH Phase 3 or worse. Supplements undernourishment (FAO chronic prevalence) rather than replacing it — acute crisis and chronic hunger move differently, and a country can improve on one while worsening on the other. Coverage grows as IPC adds countries, so check the denominator before reading a trend.',
  },
];

/**
 * Indicators the framework asks for that no source can currently supply.
 *
 * Distinct from `PENDING_METRICS`, and the distinction is the whole reason this
 * array exists. A pending metric has a working adapter and a real endpoint; it
 * is waiting on a key or on someone typing a CSV in, and it will start producing
 * numbers the moment it gets one. Nothing here has a source at all.
 *
 * There is deliberately no `sourceAdapterId` field: writing one would imply an
 * adapter exists, and `refresh.ts` would then try to call it every day and log a
 * failure forever. These are a to-do list, not a pipeline.
 *
 * Both entries were in the original twelve hardcoded indicators, where they had
 * hand-authored values and so appeared to work. They do not survive contact with
 * a real source:
 *
 *   girls_primary_school — OWID has no world aggregate for female primary net
 *     enrolment, only per-country series. Replaced in scoring by mean years of
 *     schooling, which is a world series and covers both sexes.
 *   mobile_coverage — the nearest OWID series is mobile *subscriptions per 100
 *     people*, which reads about 111 and therefore cannot be normalised against
 *     a 100% target without producing a metric that is permanently solved.
 *     Replaced in scoring by electricity access.
 *
 * Kept because the gap is worth remembering. Deleting them would make the
 * framework look complete when two of its intended indicators are missing, and
 * the substitutes are genuinely not the same measurement.
 */
export const UNSOURCED_METRICS: {
  id: string;
  label: string;
  category: string;
  unit: string;
  direction: MetricDirection;
  /** Why there is no series, and what would have to change. */
  gap: string;
}[] = [
  {
    id: 'girls-primary-school',
    label: 'Girls in primary school',
    category: 'education',
    unit: '%',
    direction: 'higher_is_better',
    gap: 'No world aggregate in OWID — female primary net enrolment exists per country only. A world figure would need UIS (UNESCO Institute for Statistics) bulk data and a population-weighted aggregation of our own. Mean years of schooling stands in for it in the score.',
  },
  {
    id: 'mobile-coverage',
    label: 'Mobile network coverage',
    category: 'connection',
    unit: '%',
    direction: 'higher_is_better',
    gap: 'OWID carries mobile subscriptions per 100 people (~111), not population covered, and the two are not interchangeable — subscriptions exceed 100 because people hold several. Real coverage would come from the ITU or GSMA, neither of which publishes it openly. Electricity access stands in for it in the score.',
  },
];

export function metricById(id: string): MetricConfig {
  const metric = METRICS.find((candidate) => candidate.id === id);
  if (!metric) throw new Error(`Unknown metric: ${id}`);
  return metric;
}
