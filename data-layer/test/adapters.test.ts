import { describe, expect, it } from 'vitest';

import { weeklyFatalities } from '../src/adapters/acled.js';
import { annualMeanSeries, parseSeaIceCsv } from '../src/adapters/nsidc-sea-ice.js';
import { parseSeedCsv } from '../src/adapters/seeded.js';
import { annualCounts, publicationYear } from '../src/adapters/who-outbreaks.js';
import { CATEGORY_WEIGHTS, METRICS, PENDING_METRICS } from '../src/config/metrics.js';

/**
 * Parsers and rollups for the sources added alongside OWID/NOAA/Ember.
 *
 * The inputs below are real strings taken from the live feeds, not invented
 * ones. Three of the four sources here have a format quirk that silently
 * produces a wrong number rather than an error, and every one of those was found
 * by running against live data rather than by reading the docs — so the cases
 * that pin them are the point of this file.
 */

describe('NSIDC sea ice', () => {
  const HEADER =
    'Year, Month, Day,     Extent,    Missing, Source Data\n' +
    'YYYY,    MM,  DD, 10^6 sq km, 10^6 sq km, Source data product web sites: http://nsidc.org/data/nsidc-0081.html\n';

  it('skips both header lines and parses padded fields', () => {
    const rows = parseSeaIceCsv(
      `${HEADER}1978,    10,  26,     10.231,      0.000, ['/ecs/DP1/PM/NSIDC-0051.001/1978.10.26/nt_19781026_n07_v1.1_n.bin']\n`,
    );

    expect(rows).toEqual([{ date: '1978-10-26', extent: 10.231 }]);
  });

  it('tolerates a quoted trailing field containing commas', () => {
    // The newest rows quote the source list, which contains commas. Only the
    // first four fields are read, so the quoting never has to be understood —
    // this pins that.
    const rows = parseSeaIceCsv(
      `${HEADER}2026,    07,  29,      6.544,      0.000,"['/a/one.nc', '/a/two.nc']"\n`,
    );

    expect(rows).toEqual([{ date: '2026-07-29', extent: 6.544 }]);
  });

  it('removes the seasonal cycle rather than tracking it', () => {
    // Two years of a pure sine between 5 and 15 with no trend. A correct annual
    // mean is flat at 10; anything that tracks the season swings by ±5.
    const rows: { date: string; extent: number }[] = [];
    const start = Date.UTC(2000, 0, 1);
    for (let day = 0; day < 365 * 3; day += 1) {
      const time = start + day * 86_400_000;
      rows.push({
        date: new Date(time).toISOString().slice(0, 10),
        extent: 10 + 5 * Math.sin((2 * Math.PI * day) / 365),
      });
    }

    const series = annualMeanSeries(rows);

    expect(series.length).toBeGreaterThan(10);
    for (const point of series) {
      expect(point.extent).toBeCloseTo(10, 1);
    }
  });

  it('emits no window that runs off either end of the record', () => {
    // The bug this pins: a window centred near the last observation covers only
    // half a year. On the real series that half is the winter maximum, and the
    // newest point reported 12.2 for a year whose true mean is 10.1 — a 20%
    // error, in the optimistic direction, on the only point the tile shows.
    const rows: { date: string; extent: number }[] = [];
    const start = Date.UTC(2000, 0, 1);
    for (let day = 0; day < 365 * 2; day += 1) {
      const time = start + day * 86_400_000;
      rows.push({
        date: new Date(time).toISOString().slice(0, 10),
        extent: day < 182 || (day >= 365 && day < 547) ? 15 : 5,
      });
    }

    const series = annualMeanSeries(rows);

    // Every emitted window must average both halves, never one.
    for (const point of series) {
      expect(point.extent).toBeGreaterThan(8);
      expect(point.extent).toBeLessThan(12);
    }
  });

  it('returns nothing rather than guessing from too short a record', () => {
    expect(annualMeanSeries([{ date: '2020-01-01', extent: 12 }])).toEqual([]);
    expect(annualMeanSeries([])).toEqual([]);
  });
});

describe('WHO outbreak news', () => {
  // All four real UrlName formats, from the live feed.
  it('recovers the year from every slug format', () => {
    expect(publicationYear({ UrlName: '2003_05_23b-en' })).toBe(2003);
    expect(publicationYear({ UrlName: '24-july-2015-mers-saudi-arabia-en' })).toBe(2015);
    expect(publicationYear({ UrlName: '2020-DON236' })).toBe(2020);
  });

  it('prefers the slug over a PublicationDate corrupted by the CMS migration', () => {
    // This is the whole reason the resolver exists. WHO's 2021 site migration
    // stamped PublicationDate = June 2021 on the entire 1996-2018 archive. Trust
    // the field and 979 reports land in one month while 2020 empties out.
    expect(
      publicationYear({ UrlName: '2001_03_26-en', PublicationDate: '2021-06-30T00:00:00Z' }),
    ).toBe(2001);

    expect(
      publicationYear({ UrlName: '2020-DON236', PublicationDate: '2021-03-04T00:00:00Z' }),
    ).toBe(2020);
  });

  it('falls back to PublicationDate only for post-migration records', () => {
    // These have no date in the slug, and their PublicationDate is sound.
    expect(
      publicationYear({
        UrlName: 'middle-east-respiratory-syndrome-coronavirus---saudi-arabia',
        PublicationDate: '2024-02-23T00:00:00Z',
      }),
    ).toBe(2024);
  });

  it('reads the separator-less DON form the oldest records use', () => {
    // `2000DON220`, no hyphen. Same shape as `2020-DON236` and equally
    // recoverable, which matters because these are the records whose
    // PublicationDate the migration destroyed.
    expect(publicationYear({ UrlName: '2000DON220' })).toBe(2000);
  });

  it('gives up rather than inventing a year', () => {
    expect(publicationYear({})).toBeNull();
    expect(publicationYear({ UrlName: 'cholera---haiti' })).toBeNull();
    expect(publicationYear({ UrlName: '' })).toBeNull();
  });

  it('fills interior gaps with zero so a quiet year is distinguishable from a missing one', () => {
    const counts = annualCounts([
      { UrlName: '2001_01_01-en' },
      { UrlName: '2001_02_01-en' },
      { UrlName: '2004_01_01-en' },
    ]);

    expect(counts).toEqual([
      { year: 2001, count: 2 },
      { year: 2002, count: 0 },
      { year: 2003, count: 0 },
      { year: 2004, count: 1 },
    ]);
  });
});

describe('ACLED weekly rollup', () => {
  it('buckets events into ISO weeks starting Monday', () => {
    // 2026-07-29 is a Wednesday; its week starts Monday 2026-07-27.
    const weeks = weeklyFatalities([
      { event_date: '2026-07-27', fatalities: 3 },
      { event_date: '2026-07-29', fatalities: 4 },
      { event_date: '2026-08-03', fatalities: 5 },
    ]);

    expect(weeks).toEqual([
      { week: '2026-07-27', fatalities: 7 },
      { week: '2026-08-03', fatalities: 5 },
    ]);
  });

  it('coerces the string fatalities the API actually returns', () => {
    const weeks = weeklyFatalities([
      { event_date: '2026-07-27', fatalities: '2' },
      { event_date: '2026-07-28', fatalities: 1 },
    ]);

    expect(weeks).toEqual([{ week: '2026-07-27', fatalities: 3 }]);
  });

  it('drops unparseable rows instead of counting them as zero-fatality events', () => {
    expect(weeklyFatalities([{ event_date: 'not-a-date', fatalities: 9 }])).toEqual([]);
    expect(weeklyFatalities([{ event_date: '2026-07-27', fatalities: '-' }])).toEqual([]);
  });
});

describe('seeded CSV', () => {
  it('ignores comments and the header, and sorts by date', () => {
    const rows = parseSeedCsv(
      [
        '# RSF World Press Freedom Index',
        '# SOURCE https://rsf.org/en/index',
        'observed_at,value,source_url,entered_on',
        '2024-01-01,66.02,https://rsf.org/en/index,2026-07-30',
        '2023-01-01,63.10,https://rsf.org/en/index,2026-07-30',
      ].join('\n'),
      'seed:press-freedom',
    );

    expect(rows.map((row) => row.observedAt)).toEqual(['2023-01-01', '2024-01-01']);
    expect(rows[1].value).toBe(66.02);
    expect(rows[1].enteredOn).toBe('2026-07-30');
  });

  it('accepts a file with no rows — that is the shipped state', () => {
    expect(parseSeedCsv('# nothing yet\nobserved_at,value,source_url,entered_on\n', 'x')).toEqual([]);
  });

  it('throws on a malformed row rather than skipping it', () => {
    // A silently dropped row is a silently wrong series, and nobody re-reads a
    // CSV they typed a year ago.
    expect(() => parseSeedCsv('observed_at,value\n2024,66.02\n', 'x')).toThrow(/bad observed_at/);
    expect(() => parseSeedCsv('observed_at,value\n2024-01-01,abc\n', 'x')).toThrow(/bad value/);
  });
});

describe('metric config', () => {
  it('keeps every category on its declared budget', () => {
    // The import-time check in config/metrics.ts already enforces this; running
    // it here means a bad edit fails as a named test rather than as an opaque
    // module-load error inside some other suite.
    for (const [category, expected] of Object.entries(CATEGORY_WEIGHTS)) {
      const actual = METRICS.filter((metric) => metric.category === category).reduce(
        (total, metric) => total + metric.weight,
        0,
      );
      expect(actual, category).toBeCloseTo(expected, 3);
    }
  });

  it('totals 1.00 across the scored set', () => {
    expect(METRICS.reduce((total, metric) => total + metric.weight, 0)).toBeCloseTo(1, 3);
  });

  it('gives every category in the scored set a declared budget', () => {
    for (const metric of METRICS) {
      expect(CATEGORY_WEIGHTS, metric.id).toHaveProperty(metric.category);
    }
  });

  it('keeps pending metrics out of the scored set', () => {
    const scored = new Set(METRICS.map((metric) => metric.id));
    for (const pending of PENDING_METRICS) {
      expect(scored.has(pending.id), pending.id).toBe(false);
    }
  });

  it('scores disease-outbreaks at zero', () => {
    // Weighted, this would let WHO's editorial style guide raise a progress
    // score — the report count fell from 206 to 52 largely because WHO started
    // consolidating updates. Pinned so a future tidy-up does not quietly
    // "fix" the zero.
    const outbreaks = METRICS.find((metric) => metric.id === 'disease-outbreaks');
    expect(outbreaks?.weight).toBe(0);
  });
});
