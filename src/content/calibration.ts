/**
 * Screen 5 content — GROUP A only.
 *
 * THE HONESTY RULE, which is not negotiable and should survive any rewrite of
 * this copy: this screen states what is true. It never says "don't worry", it
 * never implies the user is wrong to feel bad, and it is allowed — required —
 * to show a trend going the wrong way. If every category here reads as good
 * news, the screen has become reassurance, and reassurance that the user can
 * check and disprove costs more trust than it buys. Two of the five below are
 * deliberately bad trends.
 *
 * All copy is PLACEHOLDER. The numbers are illustrative and unsourced — replace
 * them, and cite them, before this goes near a user.
 */

import type { Category } from '@/content/categories';

/** Which way the line is going. What it *means* is carried by `label`. */
export type TrendDirection = 'up' | 'down' | 'flat';

export interface CalibrationEntry {
  trend: {
    direction: TrendDirection;
    /** Six words or so. Says what moved and which way. */
    label: string;
    body: string;
  };
  /** What is actually being done. Institutions, not vibes. */
  response: string;
  /** One concrete thing, small enough to do this week. */
  action: string;
}

/**
 * Keyed by category id. GROUP B is absent by design — the screen never renders
 * for it.
 */
export const CALIBRATION: Record<string, CalibrationEntry> = {
  /**
   * The entry the flow actually renders right now.
   *
   * The first screen is currently two options rather than a topic picker, so
   * everything in GROUP A arrives here. That makes this the weakest content in
   * the app by some distance — "the trend" is not a question you can answer
   * without knowing which thing — and it is the first thing that should
   * improve when a topic picker comes back. The five topical entries below are
   * kept for exactly that.
   */
  world: {
    trend: {
      direction: 'flat',
      label: 'PLACEHOLDER — depends which thing',
      body: "PLACEHOLDER. Some of what's frightening right now is genuinely getting worse and some of it is getting better, and the feed gives you no way to tell which is which. That's the part this screen is for.",
    },
    response:
      'PLACEHOLDER. Say who is working on it and what has actually moved, in specifics. Vague reassurance belongs nowhere near this screen.',
    action:
      'PLACEHOLDER. One thing, small enough to do this week, that is not "stay informed".',
  },

  war: {
    trend: {
      direction: 'up',
      label: 'More active conflicts than a decade ago',
      body: 'PLACEHOLDER. State-based conflicts have risen since the mid-2010s after a long decline. Battle deaths remain far below Cold War levels, but the direction over the last ten years is the wrong one.',
    },
    response:
      'PLACEHOLDER. Ceasefire mediation, humanitarian corridors, refugee resettlement programmes, war crimes documentation. Some of it works and some of it stalls.',
    action:
      'PLACEHOLDER. Give to an organisation working in one specific conflict rather than to conflict in general. Recurring beats one-off.',
  },
  climate: {
    trend: {
      direction: 'up',
      label: 'Emissions still rising, but slower',
      body: 'PLACEHOLDER. Global emissions have not peaked. Growth has slowed sharply and clean energy is now the cheapest new power in most markets — but the number that matters is still going up.',
    },
    response:
      'PLACEHOLDER. Solar and battery deployment is running ahead of every forecast made in the last decade. Grid buildout and heavy industry are the parts lagging.',
    action:
      'PLACEHOLDER. The highest-leverage individual moves are the boring ones: heat pump, electric vehicle when the current one dies, and pressure on whoever controls your building or pension.',
  },
  economy: {
    trend: {
      direction: 'flat',
      label: 'Wages roughly flat against prices',
      body: 'PLACEHOLDER. Real wages have recovered most of what inflation took since 2021, but housing costs have not come back down. It genuinely is harder than it was.',
    },
    response:
      'PLACEHOLDER. Rate policy has brought headline inflation down. Housing supply is the part almost nowhere has fixed.',
    action:
      'PLACEHOLDER. Local: housing supply is decided in council meetings that almost nobody attends.',
  },
  disease: {
    trend: {
      direction: 'down',
      label: 'Child mortality still falling',
      body: 'PLACEHOLDER. Deaths of children under five have more than halved since 2000 and continue to fall. Antimicrobial resistance is moving the other way and is the thing worth being worried about.',
    },
    response:
      'PLACEHOLDER. Vaccination coverage has recovered past its pandemic dip. New antibiotic development remains badly underfunded.',
    action:
      'PLACEHOLDER. Be current on your own vaccinations. It is a small thing and it is genuinely the one that scales.',
  },
  politics: {
    trend: {
      direction: 'down',
      label: 'Fewer people living in democracies',
      body: 'PLACEHOLDER. By most indices the share of the world living under liberal democracy has fallen for over a decade, back to roughly 1990 levels. This is a real reversal, not a measurement artefact.',
    },
    response:
      'PLACEHOLDER. Courts, election monitors and local press are where the resistance actually happens, and local press is the weakest link.',
    action:
      'PLACEHOLDER. Pay for one local news outlet. Local coverage collapsing is upstream of most of the rest of it.',
  },
};

export function calibrationFor(category: Category): CalibrationEntry | null {
  return CALIBRATION[category.id] ?? null;
}
