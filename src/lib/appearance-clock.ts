/**
 * Which appearance the app should open in, given the time of day and whatever
 * the reader last chose. Pure — no storage, no React, no `react-native`.
 *
 * The rule in one line: **it opens light between six in the morning and six in
 * the evening, and dark the rest of the time, unless you have already told it
 * otherwise today.**
 *
 * ## Why the app has an opinion about this at all
 *
 * The palette was drawn for paper first and the app used to open light always,
 * on the argument that the system scheme is somebody's phone preference rather
 * than a preference about this app. That argument survives — the system scheme
 * is still never consulted — but it answered the wrong question. The reason a
 * reader wants dark at eleven at night is not that their phone is dark; it is
 * that the room is. This app is opened by someone who is anxious, often in bed,
 * and a full page of paper-white at that hour is a physical unpleasantness
 * before it is an aesthetic one.
 *
 * The clock is a better guess at the room than the system flag is, and it costs
 * nothing to be wrong about: the switch is in the corner of every screen.
 *
 * ## Why a choice expires
 *
 * The hard part is not the clock, it is what a deliberate tap on the switch
 * means afterwards. Two obvious answers are both wrong.
 *
 * If a choice is permanent, then anybody who has ever touched the switch never
 * sees the clock again — the feature is dead for exactly the people who care
 * enough to have used the control. And if a choice lasts only for the session,
 * then someone who wants dark in the afternoon has to say so every single time,
 * which is a control that does not work.
 *
 * So a choice lasts until the part of the day it was made in ends. Flip to dark
 * over lunch and it stays dark for the afternoon; open the app that evening and
 * it is dark because it is evening; open it the next morning and it is light
 * again. The switch is obeyed for as long as the reason for pressing it plausibly
 * still holds, and the clock takes over once it plainly does not.
 *
 * ## Two phases, not a gradient
 *
 * Six to six. Real dusk moves by an hour and a half across the year and depends
 * on latitude, and none of that is knowable without a location permission this
 * app will not ask for — see the note in `region-picker.tsx` about asking rather
 * than looking. A fixed pair of hours is legible, predictable, and wrong by at
 * most an hour or so in either direction at the extremes of the year.
 */

/** The two halves of the day, as this app divides them. */
export type DayPhase = 'day' | 'night';

/** The appearance each half opens in. */
export type Appearance = 'light' | 'dark';

/**
 * When each phase begins, as a local hour on a 24-hour clock.
 *
 * Six and eighteen: "morning to afternoon" and "evening to night" as most people
 * would draw the line, and both are round numbers a reader can predict without
 * being told. Moving them is the one adjustment this file expects to need.
 */
export const DAY_BEGINS = 6;
export const NIGHT_BEGINS = 18;

/** Which half of the day a moment falls in, by the device's own clock. */
export function phaseAt(now: Date): DayPhase {
  const hour = now.getHours();

  return hour >= DAY_BEGINS && hour < NIGHT_BEGINS ? 'day' : 'night';
}

/** What a phase opens in, absent anything the reader has said. */
export function appearanceFor(phase: DayPhase): Appearance {
  return phase === 'night' ? 'dark' : 'light';
}

/**
 * The appearance to open in.
 *
 * `chosen` and `chosenIn` are what the reader last picked and the phase they
 * picked it in — both null on a first launch, and both read from storage by the
 * caller so that this stays a pure function of its arguments.
 *
 * A stored choice is honoured only while the app is still in the phase it was
 * made in. Anything else — nothing stored, an unreadable value, or a choice made
 * in the other half of the day — falls through to the clock.
 *
 * A stored choice with no phase alongside it also falls through, and that is the
 * deliberate migration for readers who set the switch before any of this
 * existed. Their old choice is not thrown away so much as allowed to expire the
 * same way a new one would, at the next boundary — which for a preference set at
 * an unknown time is the only honest reading of it.
 */
export function openingAppearance(
  chosen: string | null,
  chosenIn: string | null,
  now: Date,
): Appearance {
  const phase = phaseAt(now);

  if ((chosen === 'light' || chosen === 'dark') && chosenIn === phase) {
    return chosen;
  }

  return appearanceFor(phase);
}
