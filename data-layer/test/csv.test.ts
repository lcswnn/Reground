import { describe, expect, it } from 'vitest';

import { assertNotJsonError, parseOwidCsv, periodToIsoDate, splitCsvLine } from '../src/csv.js';
import { parseNoaaTrend } from '../src/adapters/noaa-co2.js';

describe('splitCsvLine', () => {
  it('handles quoted fields containing commas', () => {
    expect(splitCsvLine('"Congo, Dem. Rep.",COD,2020,1.5')).toEqual([
      'Congo, Dem. Rep.',
      'COD',
      '2020',
      '1.5',
    ]);
  });

  it('handles escaped quotes', () => {
    expect(splitCsvLine('"a ""quoted"" name",X,1')).toEqual(['a "quoted" name', 'X', '1']);
  });

  it('preserves empty trailing fields', () => {
    expect(splitCsvLine('World,OWID_WRL,2024,10.4,,')).toEqual([
      'World',
      'OWID_WRL',
      '2024',
      '10.4',
      '',
      '',
    ]);
  });
});

describe('periodToIsoDate', () => {
  it('converts a Year to January 1st', () => {
    expect(periodToIsoDate('2024', 'Year')).toBe('2024-01-01');
  });

  it('passes a Day straight through', () => {
    expect(periodToIsoDate('2026-07-27', 'Day')).toBe('2026-07-27');
  });

  it('pads short years', () => {
    expect(periodToIsoDate('750', 'Year')).toBe('0750-01-01');
  });

  it('handles the negative years in long-run series', () => {
    // The poverty series reaches back to -10000.
    expect(periodToIsoDate('-10000', 'Year')).toBe('-10000-01-01');
  });

  it('throws on garbage rather than producing an invalid date', () => {
    expect(() => periodToIsoDate('n/a', 'Year')).toThrow(/Unparseable/);
  });
});

describe('parseOwidCsv — Year vs Day variance', () => {
  const annual = [
    'entity,code,year,life_expectancy_0',
    'World,OWID_WRL,2022,72.8',
    'World,OWID_WRL,2023,73.1694',
    'Zimbabwe,ZWE,2023,59.3',
  ].join('\n');

  const daily = [
    'entity,code,day,co2_concentration',
    'World,OWID_WRL,2026-07-26,427.83',
    'World,OWID_WRL,2026-07-27,427.84',
  ].join('\n');

  it('detects an annual chart and normalises to Jan 1', () => {
    const parsed = parseOwidCsv(annual, { slug: 'life-expectancy', entityCode: 'OWID_WRL' });

    expect(parsed.periodColumn).toBe('Year');
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].date).toBe('2022-01-01');
    expect(parsed.rows[1].values.life_expectancy_0).toBe('73.1694');
  });

  it('detects a daily chart and keeps the full date', () => {
    const parsed = parseOwidCsv(daily, { slug: 'co2', entityCode: 'OWID_WRL' });

    expect(parsed.periodColumn).toBe('Day');
    expect(parsed.rows[1].date).toBe('2026-07-27');
  });

  it('filters to the requested entity', () => {
    const parsed = parseOwidCsv(annual, { slug: 'life-expectancy', entityCode: 'OWID_WRL' });
    expect(parsed.rows.every((row) => row.code === 'OWID_WRL')).toBe(true);
  });

  it('returns no rows when the chart has no world aggregate', () => {
    // The real failure mode: a valid CSV of country rows and nothing for the
    // world. The adapter turns this into a loud error rather than a silent
    // zero-observation success.
    const countriesOnly = [
      'entity,code,year,value',
      'Zimbabwe,ZWE,2025,43.5',
      'Zambia,ZMB,2025,71.6',
    ].join('\n');

    const parsed = parseOwidCsv(countriesOnly, { slug: 'children-not-in-school', entityCode: 'OWID_WRL' });
    expect(parsed.rows).toHaveLength(0);
  });

  it('sorts rows by date even when the source does not', () => {
    const unsorted = [
      'entity,code,year,v',
      'World,OWID_WRL,2024,3',
      'World,OWID_WRL,1990,1',
      'World,OWID_WRL,2000,2',
    ].join('\n');

    const parsed = parseOwidCsv(unsorted, { slug: 'x', entityCode: 'OWID_WRL' });
    expect(parsed.rows.map((row) => row.date)).toEqual([
      '1990-01-01',
      '2000-01-01',
      '2024-01-01',
    ]);
  });

  it('rejects a header without a Year or Day column', () => {
    expect(() =>
      parseOwidCsv('entity,code,period,v\nWorld,OWID_WRL,2024,1', { slug: 'x' }),
    ).toThrow(/Year or Day/);
  });
});

describe('assertNotJsonError', () => {
  it('catches the 200-with-a-403-body that OWID returns for blocked charts', () => {
    const body =
      '{"status":403,"error":"This chart contains non-redistributable data that we are not allowed to re-share and it therefore cannot be downloaded as a CSV."}';

    expect(() => assertNotJsonError(body, 'homicide-rate')).toThrow(/non-redistributable/);
  });

  it('passes real CSV through', () => {
    expect(() => assertNotJsonError('entity,code,year,v\nWorld,OWID_WRL,2024,1', 'x')).not.toThrow();
  });
});

describe('parseNoaaTrend', () => {
  const file = [
    '# NOAA global CO2 trend',
    '# year  month  day  smoothed  trend',
    '   2016     1    1   402.66   401.59',
    '   2026     7   27   425.12   427.84',
    '   2026     7   28  -999.99  -999.99',
    '',
  ].join('\n');

  it('skips comments, blanks, and the -999.99 sentinel', () => {
    const rows = parseNoaaTrend(file);
    expect(rows).toHaveLength(2);
  });

  it('zero-pads the date', () => {
    expect(parseNoaaTrend(file)[0].date).toBe('2016-01-01');
    expect(parseNoaaTrend(file)[1].date).toBe('2026-07-27');
  });

  it('reads both columns, so the adapter can choose trend over smoothed', () => {
    const [first] = parseNoaaTrend(file);
    expect(first.smoothed).toBe(402.66);
    expect(first.trend).toBe(401.59);
  });
});
