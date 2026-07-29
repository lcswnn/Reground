import { describe, expect, it, vi } from 'vitest';

import type { HumanityMetric, HumanitySeriesPoint } from '@/api/humanity';
import { dayNumber, describeChange, selectDailyCard } from '@/lib/daily-card';

// `@/api/humanity` is imported for `formatMetricValue`, and it resolves the
// artifact URL at module scope — so importing it drags in the env check, which
// throws under vitest where no `.env` is loaded. The formatter itself is pure and
// touches none of this.
vi.mock('@/lib/env', () => ({
  env: { supabaseUrl: 'https://example.test', supabaseKey: 'test-key' },
}));

/**
 * A metric with a straight-line annual series, which is enough for every angle:
 * what is under test is the selection, the arithmetic, and the grammar, not the
 * shape of any real indicator.
 */
function metric(overrides: Partial<HumanityMetric> = {}): HumanityMetric {
  const series = overrides.series ?? annual(1990, 2024, (year) => 10 - (year - 1990) * 0.2);
  const last = series[series.length - 1];

  return {
    id: 'child-mortality',
    label: 'Child mortality before 5',
    category: 'health',
    currentValue: last.v,
    isProjected: false,
    lastObservedAt: last.t,
    lastObservedValue: last.v,
    sourceLastUpdated: null,
    normalized: 0.5,
    normalizedObserved: 0.5,
    contribution: 0.1,
    weight: 1,
    baselineValue: 10,
    targetValue: 2.5,
    direction: 'lower_is_better',
    polarity: 'contributor',
    unit: '%',
    basis: 'test',
    delta: 'test',
    nowcastConfidence: 1,
    sourceName: 'OWID',
    sourceUrl: 'https://example.test',
    ...overrides,
    series,
  };
}

function annual(
  fromYear: number,
  toYear: number,
  value: (year: number) => number,
): HumanitySeriesPoint[] {
  const points: HumanitySeriesPoint[] = [];
  for (let year = fromYear; year <= toYear; year += 1) {
    points.push({ t: `${year}-01-01`, v: value(year) });
  }
  return points;
}

describe('dayNumber', () => {
  it('advances by exactly one per calendar day', () => {
    expect(dayNumber('2026-07-30') - dayNumber('2026-07-29')).toBe(1);
  });

  it('is stable across a month boundary', () => {
    expect(dayNumber('2026-08-01') - dayNumber('2026-07-31')).toBe(1);
  });

  it('does not shift with the local timezone', () => {
    // The whole reason `dayNumber` parses as UTC: a bare local-date parse puts
    // anyone west of Greenwich on the previous index for part of the day.
    expect(dayNumber('1970-01-01')).toBe(0);
  });
});

describe('describeChange', () => {
  it('rounds a halving into words rather than a percentage', () => {
    expect(describeChange(10, 4.5)?.phrase).toBe('more than halved');
  });

  it('keeps the percentage when no rounded phrase fits', () => {
    expect(describeChange(10, 7.5)?.phrase).toBe('fallen by 25%');
  });

  it('states a share in percentage points rather than a relative percentage', () => {
    // 85.6% → 87.7% is "up 3%" relatively and "up 2.1 points" absolutely, and a
    // reader will take the first to mean the second.
    expect(describeChange(85.6, 87.7, '%')?.phrase).toBe('risen by 2.1 percentage points');
    expect(describeChange(85.6, 87.7)?.phrase).toBe('risen by 2%');
  });

  it('leaves the rounded phrases relative even for a share', () => {
    // Halving a share is unambiguous in either reading, and "fallen by 4.7
    // percentage points" is the weaker sentence.
    expect(describeChange(9.35, 3.74, '%')?.phrase).toBe('more than halved');
    expect(describeChange(9.35, 3.74, '%')?.magnitude).toBe('5.6 percentage points');
  });

  it('never overstates: 49% off is not "more than halved"', () => {
    expect(describeChange(10, 5.1)?.phrase).toBe('roughly halved');
    expect(describeChange(10, 5)?.phrase).toBe('more than halved');
  });

  it('describes growth by factor', () => {
    expect(describeChange(10, 21)?.phrase).toBe('more than doubled');
    expect(describeChange(10, 105)?.phrase).toBe('grown more than tenfold');
    expect(describeChange(10, 12)?.phrase).toBe('risen by 20%');
  });

  it('returns null below the noise floor', () => {
    expect(describeChange(100, 100.5)).toBeNull();
  });

  it('returns null for a zero or negative starting point', () => {
    expect(describeChange(0, 5)).toBeNull();
    expect(describeChange(-1, 5)).toBeNull();
  });

  it('signs the percentage', () => {
    expect(describeChange(10, 5)?.pct).toBeCloseTo(-50);
    expect(describeChange(10, 15)?.pct).toBeCloseTo(50);
    expect(describeChange(10, 15)?.rose).toBe(true);
  });
});

describe('selectDailyCard', () => {
  const thirteen = Array.from({ length: 13 }, (_, index) =>
    metric({ id: `metric-${index}`, label: `Metric ${index}` }),
  );

  it('is stable through the day and changes with it', () => {
    const monday = selectDailyCard(thirteen, { date: '2026-07-29' });
    const again = selectDailyCard(thirteen, { date: '2026-07-29' });
    const tuesday = selectDailyCard(thirteen, { date: '2026-07-30' });

    expect(monday?.key).toBe(again?.key);
    expect(monday?.key).not.toBe(tuesday?.key);
  });

  it('never shows the same metric two days running', () => {
    let previous: string | null = null;

    for (let offset = 0; offset < 40; offset += 1) {
      const date = isoAfter('2026-01-01', offset);
      const card = selectDailyCard(thirteen, { date });
      expect(card).not.toBeNull();
      expect(card?.metric.id).not.toBe(previous);
      previous = card?.metric.id ?? null;
    }
  });

  it('reframes an indicator the next time it comes round', () => {
    const first = selectDailyCard(thirteen, { date: '2026-01-01' });
    // Thirteen metrics, so one full lap later is the same subject again.
    const secondLap = selectDailyCard(thirteen, { date: isoAfter('2026-01-01', 13) });

    expect(secondLap?.metric.id).toBe(first?.metric.id);
    expect(secondLap?.headline).not.toBe(first?.headline);
  });

  it('produces months of distinct cards from thirteen metrics', () => {
    const headlines = new Set<string>();
    for (let offset = 0; offset < 78; offset += 1) {
      const card = selectDailyCard(thirteen, {
        date: isoAfter('2026-01-01', offset),
        birthDate: '1994-06-02',
      });
      if (card) headlines.add(card.headline);
    }

    // Six angles over thirteen metrics, and these thirteen share one series, so
    // this is the floor rather than a realistic count — a real artifact's
    // differing histories open and close angles per metric. Anything much under
    // it means the fallback scan is collapsing distinct days onto one framing.
    expect(headlines.size).toBeGreaterThanOrEqual(74);
  });

  it('still fills the rotation for a reader with no birthday on file', () => {
    const headlines = new Set<string>();
    for (let offset = 0; offset < 78; offset += 1) {
      const card = selectDailyCard(thirteen, { date: isoAfter('2026-01-01', offset) });
      if (card) headlines.add(card.headline);
    }

    // One angle short — `lifetime` needs a birthday — and the days it would have
    // taken fall through to the rest of the wheel rather than going blank.
    expect(headlines.size).toBeGreaterThanOrEqual(60);
  });

  it('is unaffected by the order the artifact lists metrics in', () => {
    const shuffled = [...thirteen].reverse();
    expect(selectDailyCard(shuffled, { date: '2026-07-29' })?.key).toBe(
      selectDailyCard(thirteen, { date: '2026-07-29' })?.key,
    );
  });

  it('returns null for an empty artifact rather than throwing', () => {
    expect(selectDailyCard([], { date: '2026-07-29' })).toBeNull();
  });

  it('always finds an angle for a series too short for most of them', () => {
    // Starts in 2015: no anchor year, no full decade, too few points to call a
    // record or a turning point. The scan has to fall all the way through.
    const young = metric({
      id: 'internet-access',
      series: annual(2015, 2024, (year) => 40 + (year - 2015) * 2),
      direction: 'higher_is_better',
      targetValue: 100,
    });

    for (let offset = 0; offset < 12; offset += 1) {
      const card = selectDailyCard([young], { date: isoAfter('2026-01-01', offset) });
      expect(card).not.toBeNull();
      expect(card?.headline).toMatch(/\S/);
    }
  });

  it('uses the reader’s birthday when one is on file, and not otherwise', () => {
    // Walk a lap and a bit so the lifetime angle's turn comes round.
    const withBirthday = new Set<string>();
    const without = new Set<string>();

    for (let offset = 0; offset < 78; offset += 1) {
      const date = isoAfter('2026-01-01', offset);
      withBirthday.add(selectDailyCard(thirteen, { date, birthDate: '1994-06-02' })?.angle ?? '');
      without.add(selectDailyCard(thirteen, { date })?.angle ?? '');
    }

    expect(withBirthday).toContain('lifetime');
    expect(without).not.toContain('lifetime');
  });
});

describe('angle honesty', () => {
  /** Pulls one specific angle out of the rotation, whatever day it lands on. */
  function cardFor(subject: HumanityMetric, angle: string, birthDate?: string) {
    for (let offset = 0; offset < 400; offset += 1) {
      const card = selectDailyCard([subject], {
        date: isoAfter('2026-01-01', offset),
        birthDate,
      });
      if (card?.angle === angle) return card;
    }
    return null;
  }

  it('marks a falling "lower is better" metric as progress', () => {
    const card = cardFor(metric(), 'since-anchor');
    expect(card?.isProgress).toBe(true);
  });

  it('marks a rising "lower is better" metric as a loss', () => {
    const rising = metric({
      series: annual(1990, 2024, (year) => 400 + (year - 1990) * 2),
      direction: 'lower_is_better',
    });
    expect(cardFor(rising, 'since-anchor')?.isProgress).toBe(false);
  });

  it('says nothing about progress when the artifact has no direction', () => {
    const undirected = metric({ direction: undefined });
    expect(cardFor(undirected, 'since-anchor')?.isProgress).toBeNull();
  });

  it('calls a record what it is, in both directions', () => {
    const best = metric({ series: annual(1990, 2024, (year) => 10 - (year - 1990) * 0.2) });
    const bestCard = cardFor(best, 'record');
    expect(bestCard?.headline).toContain('never been lower');
    expect(bestCard?.isProgress).toBe(true);

    const worst = metric({ series: annual(1990, 2024, (year) => 10 + (year - 1990) * 0.2) });
    const worstCard = cardFor(worst, 'record');
    expect(worstCard?.headline).toContain('never been higher');
    expect(worstCard?.isProgress).toBe(false);
  });

  it('will not project an arrival year for a metric moving away from its target', () => {
    // Rising when it should fall. A pace projection here would have to run the
    // trend backwards to reach the target, and inventing that year is the one
    // thing this file must never do.
    const wrongWay = metric({
      series: annual(1990, 2024, (year) => 10 + (year - 1990) * 0.2),
      targetValue: 2.5,
      direction: 'lower_is_better',
    });
    expect(cardFor(wrongWay, 'on-this-pace')).toBeNull();
  });

  it('projects an arrival year inside the target’s direction', () => {
    const card = cardFor(metric(), 'on-this-pace');
    expect(card?.headline).toMatch(/At the pace of the last decade/);
    // 2024 sits at 3.2 falling 0.2/yr; 2.5 is between three and four years out.
    expect(card?.headline).toMatch(/around 202[7-8]/);
  });

  it('only calls a turning point once the number has come back from it', () => {
    // Peaks in 2005 and falls for nineteen years.
    const peaked = metric({
      series: annual(1990, 2024, (year) =>
        year <= 2005 ? 5 + (year - 1990) * 0.4 : 11 - (year - 2005) * 0.3,
      ),
    });
    const card = cardFor(peaked, 'turning-point');
    expect(card?.headline).toContain('peaked in 2005');
    expect(card?.isProgress).toBe(true);

    // Still climbing: nothing has turned, so the angle has to decline to speak.
    const climbing = metric({ series: annual(1990, 2024, (year) => 5 + (year - 1990) * 0.4) });
    expect(cardFor(climbing, 'turning-point')).toBeNull();
  });

  it('ignores the projected tail when calling a record', () => {
    // The nowcast is a new low; the measurements are not. A model output must
    // not be able to set a record.
    const projectedLow = metric({
      series: [
        ...annual(1990, 2024, (year) => 10 - (year - 1990) * 0.2),
        { t: '2026-01-01', v: 0.1, projected: true },
      ],
    });
    const card = cardFor(projectedLow, 'record');
    expect(card?.detail).toContain('in 2024');
    expect(card?.detail).not.toContain('2026');
  });

  it('never reads a value from after the reader was born', () => {
    const card = cardFor(metric(), 'lifetime', '2004-06-02');
    // The 2004 point is the last one at or before the birthday — not 2005, which
    // had not been measured yet.
    expect(card?.from?.year).toBe('2004');
  });

  it('declines the lifetime angle for a birthday before the series starts', () => {
    expect(cardFor(metric(), 'lifetime', '1970-01-01')).toBeNull();
  });

  it('writes a headline as a single readable sentence', () => {
    for (const angle of ['since-anchor', 'past-decade', 'record', 'on-this-pace']) {
      const card = cardFor(metric(), angle);
      expect(card, angle).not.toBeNull();
      expect(card?.headline, angle).toMatch(/^[A-Z].*\.$/);
      expect(card?.headline, angle).not.toContain('undefined');
      expect(card?.detail, angle).not.toContain('undefined');
      expect(card?.detail, angle).not.toContain('NaN');
    }
  });

  it('charts at least a couple of points for every angle it produces', () => {
    for (let offset = 0; offset < 78; offset += 1) {
      const card = selectDailyCard([metric()], {
        date: isoAfter('2026-01-01', offset),
        birthDate: '1994-06-02',
      });
      expect(card?.spark.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});

/** `YYYY-MM-DD` a whole number of days after another, in UTC. */
function isoAfter(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
