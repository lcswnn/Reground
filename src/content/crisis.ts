/**
 * Crisis lines, by country, as data.
 *
 * Same shape and same reasons as `breathwork.ts` and `somatic.ts`: plain data
 * with no components in it, so the list can be read and tested without a
 * renderer. The sheet that draws it is `session/ui/support-access.tsx`.
 *
 * ## Every number in this file has to be verified before it ships
 *
 * This is the one place in the app where being wrong is not a design problem.
 * A stale number is a person in trouble listening to a disconnected tone, and a
 * *wrong-country* number is worse than none at all, because it is a wrong
 * answer delivered with confidence. Treat every line below as needing a check
 * against the operator's own site — not against a listicle — before release,
 * and again whenever this file is touched.
 *
 * The shortlist is deliberately short. Six countries and a fallback is not an
 * attempt at world coverage; it is the set that can actually be kept correct by
 * one person. Everywhere else goes to `findahelpline.com`, which is a directory
 * maintained by people whose job that is, and which is a better answer than a
 * number this app half-remembers.
 *
 * ## What counts as an entry
 *
 * Three rules, and they are the same ones the sheet's copy is written under:
 *
 *  1. **It is a number, not a service.** No apps, no sign-ups, no "chat with
 *     us" pages. Every row dials or texts, and every label carries the number
 *     in words so a device with no dialler still leaves something usable on
 *     screen.
 *  2. **It is free and it is open now.** A line that runs office hours is not
 *     an answer at three in the morning, which is when this file matters.
 *  3. **It takes distress, not only emergencies.** Where a country's lifeline
 *     is explicitly for suicide only, the `detail` says so rather than letting
 *     somebody decide for themselves whether they qualify.
 */

export type RegionId = 'us' | 'ca' | 'gb' | 'ie' | 'au' | 'nz' | 'elsewhere';

export interface CrisisOption {
  id: string;
  /** Carries the number in words. See rule 1 above. */
  label: string;
  /** What the line is, and who answers it. */
  detail: string;
  /** `tel:` or `sms:` only — `crisis.test.ts` holds that. */
  url: string;
}

export interface CrisisRegion {
  id: RegionId;
  /** As the user would pick it off a list. */
  name: string;
  options: readonly CrisisOption[];
}

/**
 * The country the app assumes when nobody has said otherwise, and the one every
 * unlisted country lands on. It has no numbers in it on purpose — see the note
 * above on why a directory beats a guess.
 */
export const DEFAULT_REGION: RegionId = 'elsewhere';

/** The directory every region falls back to, and the whole of `elsewhere`. */
export const HELPLINE_DIRECTORY = 'https://findahelpline.com';

export const CRISIS_REGIONS: readonly CrisisRegion[] = [
  {
    id: 'us',
    name: 'United States',
    options: [
      {
        id: 'us-988-call',
        label: 'Call 988',
        detail: 'The Suicide & Crisis Lifeline. It takes anxiety and distress calls too.',
        url: 'tel:988',
      },
      {
        id: 'us-988-text',
        label: 'Text 988',
        detail: 'The same line, in writing, if speaking out loud is too much right now.',
        url: 'sms:988',
      },
      {
        id: 'us-741741',
        label: 'Text HOME to 741741',
        detail: 'Crisis Text Line. A trained volunteer, usually within a few minutes.',
        url: 'sms:741741',
      },
      {
        id: 'us-911',
        label: 'Call 911',
        detail: 'If you or somebody near you is in immediate danger.',
        url: 'tel:911',
      },
    ],
  },
  {
    id: 'ca',
    name: 'Canada',
    options: [
      {
        id: 'ca-988-call',
        label: 'Call 988',
        detail: 'The Suicide Crisis Helpline. English and French, any time.',
        url: 'tel:988',
      },
      {
        id: 'ca-988-text',
        label: 'Text 988',
        detail: 'The same line, in writing, if speaking out loud is too much right now.',
        url: 'sms:988',
      },
      {
        id: 'ca-911',
        label: 'Call 911',
        detail: 'If you or somebody near you is in immediate danger.',
        url: 'tel:911',
      },
    ],
  },
  {
    id: 'gb',
    name: 'United Kingdom',
    options: [
      {
        id: 'gb-samaritans',
        label: 'Call 116 123',
        detail: 'Samaritans. Free, any hour, and not only for emergencies.',
        url: 'tel:116123',
      },
      {
        id: 'gb-shout',
        label: 'Text SHOUT to 85258',
        detail: 'Shout. A trained volunteer, by message.',
        url: 'sms:85258',
      },
      {
        id: 'gb-999',
        label: 'Call 999',
        detail: 'If you or somebody near you is in immediate danger.',
        url: 'tel:999',
      },
    ],
  },
  {
    id: 'ie',
    name: 'Ireland',
    options: [
      {
        id: 'ie-samaritans',
        label: 'Call 116 123',
        detail: 'Samaritans. Free, any hour, and not only for emergencies.',
        url: 'tel:116123',
      },
      {
        id: 'ie-50808',
        label: 'Text HELLO to 50808',
        detail: 'Text About It. A trained volunteer, by message.',
        url: 'sms:50808',
      },
      {
        id: 'ie-112',
        label: 'Call 112',
        detail: 'If you or somebody near you is in immediate danger.',
        url: 'tel:112',
      },
    ],
  },
  {
    id: 'au',
    name: 'Australia',
    options: [
      {
        id: 'au-lifeline',
        label: 'Call 13 11 14',
        detail: 'Lifeline. Any hour, and it takes distress calls as well as crisis ones.',
        url: 'tel:131114',
      },
      {
        id: 'au-lifeline-text',
        label: 'Text 0477 13 11 14',
        detail: 'The same line, in writing.',
        url: 'sms:0477131114',
      },
      {
        id: 'au-000',
        label: 'Call 000',
        detail: 'If you or somebody near you is in immediate danger.',
        url: 'tel:000',
      },
    ],
  },
  {
    id: 'nz',
    name: 'New Zealand',
    options: [
      {
        id: 'nz-1737-call',
        label: 'Call 1737',
        detail: 'Need to talk? A trained counsellor, free, any hour.',
        url: 'tel:1737',
      },
      {
        id: 'nz-1737-text',
        label: 'Text 1737',
        detail: 'The same line, in writing.',
        url: 'sms:1737',
      },
      {
        id: 'nz-111',
        label: 'Call 111',
        detail: 'If you or somebody near you is in immediate danger.',
        url: 'tel:111',
      },
    ],
  },
  {
    /**
     * No numbers, and that is the entry rather than a gap in it. Somebody in
     * Portugal is better served by a directory that knows their country than by
     * four numbers that do not answer there.
     */
    id: 'elsewhere',
    name: 'Somewhere else',
    options: [],
  },
] as const;

export function findRegion(id: RegionId): CrisisRegion {
  return (
    CRISIS_REGIONS.find((region) => region.id === id) ??
    CRISIS_REGIONS[CRISIS_REGIONS.length - 1]
  );
}

/**
 * The country a device's own locale suggests, or `null` if it is not one this
 * file covers.
 *
 * Used to put a tick next to a likely answer on the picker, and for nothing
 * else — the user's own choice is the only thing that is ever stored, and a
 * guess is never taken as one. `Intl` is read rather than a location permission
 * asked for: the region is already on the device, it costs nothing, and an app
 * that stores no data has no business opening a location prompt to find out
 * which hotline to print.
 */
export function guessRegion(locale: string | undefined): RegionId | null {
  if (!locale) return null;

  const match = /[-_]([A-Za-z]{2})\b/.exec(locale);
  const code = match?.[1]?.toLowerCase();
  if (!code) return null;

  return CRISIS_REGIONS.some((region) => region.id === code)
    ? (code as RegionId)
    : null;
}
