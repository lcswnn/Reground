/**
 * The breathing patterns on offer at the end, as data.
 *
 * Same shape and same reasons as `somatic.ts`, `one-more.ts` and
 * `games/catalog.ts`: plain data with no components in it, so the list can be
 * read and tested without a renderer. The mapping from an id to something that
 * paces a circle lives in `session/breathwork/`.
 *
 * ## Why there is a second breathing step at all
 *
 * The session opens with a physiological sigh, which is not repeated here — see
 * the note on `one-more.ts`'s `breathing` entry. What this offers is the other
 * family: slow paced breathing, where the point is the *rate* rather than the
 * shape of one breath. The sigh is a thing you do once and feel; these are a
 * pace you hold for a minute or two.
 *
 * ## How these four were chosen
 *
 * Every entry had to be something with a trial behind it that measured anxiety
 * or the autonomic state anxiety runs on, and the `evidence` line on each says
 * what that trial actually found — including where it found less than the
 * technique's reputation claims. Three rules did the cutting:
 *
 *  1. **It has been measured, and measured against something.** Popularity is
 *     not evidence. The two patterns here that are famous — box breathing and
 *     4-7-8 — are the two whose `evidence` lines are the most hedged, because
 *     that is what the head-to-head comparisons say.
 *  2. **It is safe to pace from a screen with nobody in the room.** This is
 *     what ruled out the breathwork that actually has the biggest reported
 *     effects: cyclic hyperventilation, holotropic and conscious connected
 *     breathing. Those deliberately drive someone into a strong physiological
 *     state and the literature on them assumes a facilitator present. Same rule
 *     that cut the somatic list, for the same reason.
 *  3. **It does something the others don't.** Two rates, and holds or no holds.
 *     A fifth pattern that was 4-in-8-out would be the first entry with a
 *     different number on it.
 *
 * Alternate nostril breathing is the one deliberate omission worth writing
 * down, because it is on every list like this. The 2024 systematic review of
 * brief interventions for *state* anxiety found it did worse than the control
 * condition — not "no better than", worse. Whatever it is for, it is not this.
 *
 * ## `evidence` is not marketing
 *
 * It is the field that makes this list honest, and it is written under
 * `CALIBRATION_COPY`'s rule: a claim only earns its place if the user could go
 * and check it and find it holds. So the lines name what was measured and in
 * whom, they say "in a trial" rather than "studies show", and where the finding
 * is weak or mixed they say that too. The one on 4-7-8 tells the reader to use
 * a different pattern if the hold is unpleasant, which is the opposite of what
 * a page selling 4-7-8 would say and is what the comparisons support.
 *
 * The rules that apply to all four — slow rather than big, holds are optional,
 * stop if it turns — are not repeated per entry. They are in `BREATHWORK_COPY`
 * and shown once, above the list.
 *
 * Order is the order on screen, and it is the order of the evidence: the two
 * six-a-minute patterns first because they are the ones that came out ahead in
 * the only trial that ran all of these against each other, and the two famous
 * ones after them.
 */

export type BreathPatternId = 'long-exhale' | 'even' | 'box' | 'four-seven-eight';

/**
 * What the circle is doing. `full` and `empty` are both holds and are drawn the
 * same way — held still, at the top or the bottom — but they are different
 * instructions to a person and are counted separately so a pattern cannot
 * accidentally hold at the wrong end.
 */
export type BreathPhaseKind = 'in' | 'full' | 'out' | 'empty';

export interface BreathPhase {
  kind: BreathPhaseKind;
  /**
   * Whole seconds, because that is the unit these patterns are named in — the
   * user is told "4 in, 6 out" and the circle has to take exactly that long or
   * the name is a lie.
   */
  seconds: number;
}

export interface BreathPattern {
  id: BreathPatternId;
  /** What it is. Named, not described — the blurb does that. */
  title: string;
  /**
   * The pattern as numbers, which is how every one of these is actually named
   * in the world. Held separately from the blurb because the intro screen shows
   * it on its own, in the eyebrow slot, where it is the one fact somebody may
   * want without reading anything else.
   */
  count: string;
  /**
   * One line for the card. Opens with `count`, because on this list the numbers
   * are what tells the options apart — unlike the somatic list, where the first
   * word has to be what the room allows, everything here works from a chair
   * with your eyes shut.
   */
  blurb: string;
  /** In order, and the circle follows it exactly. One round of the pattern. */
  phases: readonly BreathPhase[];
  /**
   * How many rounds the screen runs. Not a duration, because a breath pattern
   * cannot be cut off part way through and rounded to a minute — see
   * `BREATH_CYCLES` in `@/config/session`, which does the same arithmetic in
   * the other direction for the opening sigh.
   */
  rounds: number;
  /**
   * How to do it, in order. Read on the intro screen before starting. Shorter
   * than the somatic step lists because the circle carries the timing: what is
   * left to say is where the air goes and how much of it there should be.
   */
  steps: readonly string[];
  /** What to pay attention to, and what an unhelpful version of it feels like. */
  notice: string;
  /**
   * What is actually known about this one, in the two or three sentences it
   * takes to say it straight. See the note above — this is the field that makes
   * the list honest rather than a menu of vibes.
   */
  evidence: string;
}

export const BREATH_PATTERNS: readonly BreathPattern[] = [
  {
    id: 'long-exhale',
    // Named for the thing that makes it work rather than for its numbers. The
    // numbers are in `count`, directly underneath, and "4-6 breathing" is not
    // a name anybody would recognise anyway.
    title: 'Longer out than in',
    count: '4 in, 6 out',
    blurb: '4 in, 6 out. No holding. The exhale is where the work is.',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'out', seconds: 6 },
    ],
    // Nine rounds of ten seconds — a minute and a half, which is the band the
    // somatic movements run in and about as long as anyone will hold a pace at
    // the end of a session they have already given ten minutes to.
    rounds: 9,
    steps: [
      'In through your nose while the circle grows. Out through your mouth, or your nose, while it shrinks.',
      'No bigger than comfortable. This is a slow breath, not a deep one.',
      'Let the turn at the top happen on its own — there is nothing to hold here.',
    ],
    notice:
      'The exhale is meant to feel unhurried rather than emptied. If you are arriving at the bottom with nothing left and gasping into the next one, you are taking too much air in at the top.',
    evidence:
      'Six breaths a minute with the exhale longer than the inhale. In a 2025 trial that ran four patterns against each other, this one and the even count raised heart-rate variability more than box or 4-7-8 breathing did. Five minutes of slow breathing like this also lowered self-reported anxiety in young adults in a separate study. The same 2025 trial found people drifted into breathing too big at this rate, which is what the second step is there to stop.',
  },
  {
    id: 'even',
    title: 'Even count',
    count: '5 in, 5 out',
    blurb: '5 in, 5 out. The same pace, split down the middle. Nothing to remember.',
    phases: [
      { kind: 'in', seconds: 5 },
      { kind: 'out', seconds: 5 },
    ],
    rounds: 9,
    steps: [
      'In through your nose for the whole of the growing, out for the whole of the shrinking.',
      'Slow rather than big. If you run out of air before the circle turns, take less in next time.',
      'Nothing is held at either end. The circle turns around and so do you.',
    ],
    notice:
      'This is the easiest of the four to keep going once the screen stops, because there is only one number in it. If one of these is going to be useful to you again next week, it is probably this one.',
    evidence:
      'The same six breaths a minute, split evenly, and in that 2025 trial it did as well as the 4-and-6. What it does not have is the long-term claim: 400 people breathing at roughly this rate for ten minutes a day for a month came out no better than a matched placebo group breathing at twice the rate. Both groups improved. As something to do right now it holds up; as a daily practice the evidence is that the doing matters more than the number.',
  },
  {
    id: 'box',
    // The one title here that is a proper name rather than a description, on
    // the same argument as "5-4-3-2-1" on the list above: it is what someone
    // would already have heard it called and what they would search for.
    title: 'Box breathing',
    count: '4 in, hold 4, out 4, hold 4',
    blurb: '4 in, hold 4, out 4, hold 4. Two short pauses, one at each end.',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'full', seconds: 4 },
      { kind: 'out', seconds: 4 },
      { kind: 'empty', seconds: 4 },
    ],
    // Six rounds of sixteen seconds. A round is longer than the two above, so
    // fewer of them lands in the same minute and a half.
    rounds: 6,
    steps: [
      'In for four while the circle grows, then hold at the top for four while it sits still.',
      'Out for four while it shrinks, then hold at the bottom for four.',
      'Both holds should be comfortable. If either one is a struggle, take less air in.',
    ],
    notice:
      'The hold at the bottom is the one people find strange — an empty pause feels longer than a full one. It is meant to be unremarkable. If it makes you want to gulp the next breath, this is not the pattern to be doing today.',
    evidence:
      'The best known of these, and the one whose reputation runs ahead of its results. A 2026 field study found that one minute of it cut state anxiety more than doing nothing, and in a Stanford trial five minutes a day dropped state anxiety about as much as the sighing that opened this session. But in the 2025 head-to-head it moved heart-rate variability less than either of the two patterns above. The holds are what people like about it; they are not what the evidence is strongest on.',
  },
  {
    id: 'four-seven-eight',
    // Left as the numbers, like "5-4-3-2-1". Any English name for this would be
    // a description of the count that is longer than the count.
    title: '4-7-8',
    count: '4 in, hold 7, out 8',
    blurb: '4 in, hold 7, out 8. One long hold and a very long exhale.',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'full', seconds: 7 },
      { kind: 'out', seconds: 8 },
    ],
    // Four rounds, and deliberately the shortest run on the list. Four is where
    // the technique is conventionally capped for anyone new to it, and at 19
    // seconds a round it is also as much of a 7-second hold as this app is
    // willing to pace somebody through unsupervised.
    rounds: 4,
    steps: [
      'In through your nose for four, quietly.',
      'Hold for seven while the circle sits still. Take less air in next round if that is a strain.',
      'Out through your mouth for eight, slowly, all the way down.',
    ],
    notice:
      'Lightheaded, tingling, or a heart that speeds up rather than settles means stop — put the phone down and breathe normally until it passes. That is not a sign you did it wrong. It is the hold being too long for you today, which is common and is why this one is last.',
    evidence:
      'This one has been tested mostly in hospitals. After bariatric surgery it beat both ordinary deep breathing and no exercise on anxiety scores; in people with COPD it lowered anxiety and depression; and heart rate and blood pressure measurably drop right after a few rounds of it. It is also the pattern that comes off worst in the head-to-head comparisons: the 2025 trial called the support for it thin and measured smaller gains than plain six-a-minute breathing. The long hold is the part with the least behind it, so if it is unpleasant, use one of the patterns above rather than pushing through this one.',
  },
] as const;

export function findPattern(id: BreathPatternId): BreathPattern | undefined {
  return BREATH_PATTERNS.find((pattern) => pattern.id === id);
}

/** One round, in milliseconds. */
export function patternCycleMs(pattern: BreathPattern): number {
  return pattern.phases.reduce((total, phase) => total + phase.seconds * 1_000, 0);
}

/** The whole run, lead-in excluded — that belongs to the screen. */
export function patternRunMs(pattern: BreathPattern): number {
  return patternCycleMs(pattern) * pattern.rounds;
}

/** Breaths per minute, which is the number the trials are indexed by. */
export function patternRate(pattern: BreathPattern): number {
  return 60_000 / patternCycleMs(pattern);
}

/**
 * How long a run takes, said the way a person says it.
 *
 * Rounded to the nearest half minute and hedged with "about", because none of
 * these land on a whole one — nine rounds of ten seconds is a minute and a
 * half, six rounds of sixteen is ninety-six seconds, and reading "1 minute 36
 * seconds" back to somebody is a stopwatch talking.
 *
 * Derived rather than written into the copy, for the reason `describeDuration`
 * gives in `somatic.ts` and `BREATHE_INTRO.shape` gives for the sigh: being
 * promised a minute and given two is a small lie this app cannot afford.
 */
const LENGTHS: Readonly<Record<string, string>> = {
  '0.5': 'about half a minute',
  '1': 'about a minute',
  '1.5': 'about a minute and a half',
  '2': 'about two minutes',
  '2.5': 'about two and a half minutes',
  '3': 'about three minutes',
};

export function describeLength(ms: number): string {
  // Floored at one half-minute: a run this app would round to zero is a run it
  // should not be offering, and "about 0 minutes" is the worst way to find out.
  const halves = Math.max(1, Math.round(ms / 30_000));
  const minutes = halves / 2;
  return LENGTHS[String(minutes)] ?? `about ${Math.round(minutes)} minutes`;
}

/**
 * The commitment, stated before the user makes it: how many rounds, and how
 * long that is. Both halves matter — the count is what they will be doing and
 * the length is what they are agreeing to.
 */
export function describeRun(pattern: BreathPattern): string {
  return `${pattern.rounds} rounds, ${describeLength(patternRunMs(pattern))}`;
}
