/**
 * Screen 6 content — GROUP A only. The three things this screen always says,
 * plus the data behind them.
 *
 * THE HONESTY RULE, which is not negotiable and should survive any rewrite of
 * this copy: this screen states what is true. It never says "don't worry", it
 * never implies the user is wrong to feel bad, and it is allowed — required — to
 * show a trend going the wrong way. If every entry here reads as good news, the
 * screen has become reassurance, and reassurance that the user can check and
 * disprove costs more trust than it buys. Three of the six below lead with a
 * trend that is going the wrong way, and they lead with it rather than burying
 * it under a consolation.
 *
 * ## The three parts, and why every entry has all three
 *
 * Every entry answers the same three questions in the same order, and an entry
 * missing one of them is not shippable:
 *
 *   trend    — what is actually going on. The charts hang off this one.
 *   response — what is being done about it. Institutions and mechanisms, not
 *              vibes. This is the part that makes the screen not-a-shrug.
 *   action   — one concrete thing, small enough to do this week.
 *
 * The order is deliberate and is the shape of the thing the screen is for.
 * Ending on the trend leaves someone with a fact and nowhere to put it, which
 * is precisely the state they opened the app in. Ending on an action they could
 * do today is the only part of this screen that changes what happens next.
 *
 * ## `metricIds` is where the copy meets the data
 *
 * The prose below deliberately describes *shape and direction* rather than
 * quoting current figures. The numbers on this screen come from the artifact and
 * they move: most series are published in arrears and the nowcast redraws the
 * headline every day, so a paragraph with a hardcoded "8.4%" in it is a
 * paragraph that goes quietly wrong within a month and nobody notices. Historic
 * anchors are fair game — "about 43% in 1990" is not going to change — and the
 * live figure is the chart's job.
 *
 * That is what `metricIds` is for. It names which series from the published
 * artifact belong under this entry's trend, in the order they should be read,
 * and it is the only coupling between what the user picked and what gets
 * fetched. Ids that the artifact does not carry are dropped at render time (see
 * `metricsFor`), so promoting or retiring a metric in the data layer cannot
 * break a shipped build in either direction.
 */

import type { TopicDataKey, WorldTopic } from '@/content/topics';

/** Which way the line is going. What it *means* is carried by `label`. */
export type TrendDirection = 'up' | 'down' | 'flat';

export interface CalibrationEntry {
  trend: {
    direction: TrendDirection;
    /** Six words or so. Says what moved and which way. */
    label: string;
    body: string;
  };
  /**
   * Which series from the published artifact sit under the trend, in reading
   * order. Ids are the data layer's — see `data-layer/src/config/metrics.ts`.
   *
   * Three is the ceiling and it is a real one. Each chart is a card the height
   * of a thumb, and this screen has two more sections under it that matter more
   * than a fourth indicator does. A topic that wants a fourth wants a different
   * screen.
   *
   * Empty is a legitimate value and means "we have no series we would stand
   * behind" — not "we forgot". `politics` is the live case; see its note.
   */
  metricIds: readonly string[];
  /** What is actually being done. Institutions and mechanisms, not vibes. */
  response: string;
  /** One concrete thing, small enough to do this week. */
  action: string;
}

/**
 * Keyed by `TopicDataKey`, so the compiler requires an entry for every dataset
 * a topic can point at. GROUP B is absent by design — the screen never renders
 * for it, and it has no topic to key on.
 */
export const CALIBRATION: Record<TopicDataKey, CalibrationEntry> = {
  /**
   * The general entry, reached only by the `unsure` topic.
   *
   * It is the answer for someone who could not name one thing, and "the trend"
   * genuinely is not a question you can answer without knowing which. What it
   * must not become is a shrug — so it does the one thing that is honest here
   * and shows three of the biggest series going in three different directions,
   * which is itself the answer.
   */
  world: {
    trend: {
      direction: 'flat',
      label: 'Some of it better, some of it worse',
      body: "There isn't one answer, and anyone offering you one is selling something. Below are three of the largest numbers there are, moving three different ways: extreme poverty has collapsed since 1990, deaths in conflict are several times what they were at their low around 2010, and atmospheric CO₂ has risen every year of the record — the wobble in that last one is seasonal, the trend isn't. The feed gives you no way to tell these apart, because all three arrive in the same format, at the same size, in the same scroll.",
    },
    metricIds: ['extreme-poverty', 'conflict-deaths', 'co2-concentration'],
    response:
      "The first chart looks like that because of about forty years of vaccination programmes, cash transfers, oral rehydration and grain yields — none of which was ever a headline on any day it was happening. The third looks like that because nobody has yet made the thing causing it more expensive than the alternatives. Both are the same kind of fact: slow, institutional, and almost entirely unreported.",
    action:
      "Pick one of the three. Not all of it — one. Being vaguely informed about everything is the state you were in when you opened this app, and it's the one state from which nothing can actually be done.",
  },

  war: {
    trend: {
      direction: 'up',
      label: 'Worse than a decade ago, better than a century',
      body: "Both of those are true, and the chart below is why. Deaths in conflict per 100,000 people hit the lowest point of the record somewhere around 2005 to 2011, and have climbed to several times that since. That rise is real and it's the thing you've been reading about. The one spike that dwarfs everything else on that chart is 1994, Rwanda — and where the line sits today is a small fraction of it. What's frightening here is the direction, not the level, and the two arrive reported as one thing.",
    },
    metricIds: ['conflict-deaths', 'forced-displacement'],
    response:
      "Ceasefire mediation, humanitarian corridors, and resettlement, some of which works and much of which stalls. The least visible part is the counting itself: the displacement figures and the conflict-death series below exist because people go and do that work, and they're what every negotiation and every war-crimes case is later argued from.",
    action:
      "Give to one organisation working in one named conflict, rather than to conflict in general. Set it to recur, even if it's small — a predictable amount they can plan against is worth more to them than a larger one they can't.",
  },

  climate: {
    trend: {
      direction: 'up',
      label: 'CO₂ still rising. Clean power rising faster.',
      body: "The first chart is the one that matters most, and its yearly average has gone up every year of the record. That's the honest headline and it isn't a good one. (The wobble in it is the seasons — the northern forests breathing in and out. The line underneath only goes one way.) The second chart is why that isn't the whole story: renewables now supply roughly a third of the world's electricity, up from under a fifth at the turn of the century, and that growth compounds rather than adds. The third is what's already been lost. None of them cancel the others out — they're three clocks running at once.",
    },
    metricIds: ['co2-concentration', 'renewable-share', 'arctic-sea-ice'],
    response:
      "The price of a solar panel has fallen about 98% since 1990 — the single largest change anywhere in this dataset, and the reason the second chart bends the way it does. Batteries are repeating it roughly a decade behind. What is genuinely stuck: grid buildout, steel, cement, shipping and aviation, where the cheap alternative doesn't exist yet rather than isn't being bought.",
    action:
      "Your own footprint is not where your leverage is. The largest thing most people can move is a decision somebody else makes — what your landlord installs, what your pension is invested in, what gets approved at a planning meeting almost nobody attends. Pick whichever of those you actually have standing in.",
  },

  economy: {
    trend: {
      direction: 'down',
      label: 'Global poverty far down. Your rent, not.',
      body: "These are two different questions and the charts below only answer the first. The share of the world living in extreme poverty has fallen from about 43% in 1990 to under a tenth — the largest single change in this whole dataset, and a real one. It says nothing at all about whether you can afford where you live. If that's what you're anxious about, you're right that it's got harder, and no global chart is going to tell you otherwise.",
    },
    metricIds: ['extreme-poverty', 'undernourishment', 'electricity-access'],
    response:
      "On the global picture: electrification, cash transfers and crop yields, in about that order. On the one you probably mean: rate policy has brought headline inflation back down across most rich countries, while housing supply — the actual binding constraint on the cost of living — is the thing almost nowhere has fixed.",
    action:
      "If it's your own situation: find out what you're actually entitled to. Most countries have reliefs and benefits with take-up rates well under half, and the reason is that nobody is told. If it's the wider one: housing supply is decided at local planning meetings, and the people who reliably show up to those are the ones opposed.",
  },

  disease: {
    trend: {
      direction: 'down',
      label: 'Children dying at half the rate they were',
      body: "Of everything measured here this is the clearest. The share of children who die before their fifth birthday has more than halved since 1990 and is still falling. Life expectancy is nine years higher than it was and has recovered past its pandemic dip. The thing moving the wrong way, and it's worth knowing about, is antimicrobial resistance — which isn't on these charts because there's no clean world series for it yet.",
    },
    metricIds: ['child-mortality', 'life-expectancy', 'vaccination-coverage'],
    response:
      "Vaccination coverage took the sharpest fall in its record when services shut in 2020, and has since clawed back most of it. Most, not all — it is still short of where it stood in 2019, and the third chart shows that gap rather than hiding it. Oral rehydration, bed nets and antenatal care are doing much of the rest and have never once been news. New antibiotic development is badly underfunded, and that is an acknowledged gap rather than a hidden one.",
    action:
      "Be current on your own vaccinations, and on your children's if you have them. It's a small thing, it's the one that scales, and it is a large part of why the first chart looks like that.",
  },

  /**
   * The one entry with no charts, and deliberately so.
   *
   * `democracy-index` and `press-freedom` both exist in the data layer's
   * `PENDING_METRICS`, and both run on the seeded-CSV path — V-Dem and RSF
   * publish annual PDFs, not feeds, so `data-layer/data/democracy.csv` and
   * `press-freedom.csv` have a documented update procedure, a header, and no
   * rows. Until somebody types them in there is no series here.
   *
   * The wrong fix is to point this at an adjacent series — displacement, say —
   * and let the chart imply it is measuring democracy. That breaks the honesty
   * rule in the way that costs the most, because it is the kind of thing a
   * reader only catches after they have trusted the rest of the screen. Naming
   * the gap and naming who publishes the real numbers is the cheaper trade.
   *
   * Populate either CSV, promote the metric out of `PENDING_METRICS`, and this
   * becomes a one-line change.
   */
  politics: {
    trend: {
      direction: 'down',
      label: 'Fewer people living in democracies',
      body: "This is the one topic here we have no chart for, and saying so is better than showing you something adjacent and calling it evidence. By V-Dem's Liberal Democracy Index and by Freedom House's count, the share of the world living under liberal democracy has fallen for well over a decade, roughly back to where it was in 1990. That's a real reversal rather than a measurement artefact, and both organisations publish their full data if you want to go and check.",
    },
    metricIds: [],
    response:
      "Courts, election monitors and local press are where this is actually contested, and local press is the weakest of the three by a distance. Where backsliding has been reversed, it has almost always been reversed at the ballot box in an ordinary election rather than by anything dramatic.",
    action:
      "Pay for one local news outlet. Local coverage collapsing is upstream of most of the rest of it, and it's the cheapest thing on this list.",
  },
};

/**
 * The topic is the whole input: it is what the follow-up question was asked to
 * establish, and `dataKey` is what it resolves to. A null topic means the
 * session never went through the picker — GROUP B, or a stale route — and the
 * caller is expected to send those somewhere else rather than render a guess.
 */
export function calibrationFor(topic: WorldTopic | null): CalibrationEntry | null {
  return topic ? CALIBRATION[topic.dataKey] : null;
}
