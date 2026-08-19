/**
 * Haptics, wrapped so a failure is never louder than the thing it was marking.
 *
 * Every call is fire-and-forget: on a device with haptics turned off, or an
 * Android build without the vibrate permission, these reject, and an unhandled
 * rejection mid-breath is a worse outcome than a missing tick.
 *
 * Six things use haptics in this app and no others: the breath on both screens
 * that pace one, placing a puzzle piece, each end of a somatic movement — the
 * 3-2-1 into it and the clock running out of it — and each tense or release in
 * progressive muscle relaxation. All of them are moments where something
 * actually changed, or, in the breath's case, is changing.
 */

import * as Haptics from 'expo-haptics';

import {
  planBreathPulses,
  type BreathCadence,
  type BreathPhase,
  type PulseStrength,
} from '@/session/ui/breath-pulse';

/**
 * The boundary out of a hold — the one breath cue that is a single tap.
 *
 * Nothing is being paced during a hold, so there is nothing to pulse through
 * it; what a person with their eyes shut needs is to be told when it is over.
 * `Light`, which is the same tap the exhale opens with, because that is what
 * usually follows one.
 */
export function tickBreath() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const IMPACT: Record<PulseStrength, Haptics.ImpactFeedbackStyle> = {
  soft: Haptics.ImpactFeedbackStyle.Soft,
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
};

/**
 * A breath phase, paced in the hand: a train of pulses that builds through an
 * inhale and falls away through an exhale.
 *
 * The schedule — how many, how far apart, how firm — is `planBreathPulses`,
 * which is where the reasoning and the convention it follows are written down,
 * including what `cadence` changes and why only the sigh passes it. This is the
 * part that fires them.
 *
 * The first pulse is fired synchronously, so a phase's opening tap lands on the
 * boundary rather than a timer's-worth after it. Returns a cancel, and both
 * screens call it before starting the next phase and again on the way out: a
 * train that outlives its phase is a tap arriving during the wrong instruction,
 * which on a screen someone is following with their eyes shut is worse than no
 * tap at all.
 */
export function pulseBreath(
  phase: BreathPhase,
  ms: number,
  cadence: BreathCadence = 'paced',
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const pulse of planBreathPulses(phase, ms, cadence)) {
    if (pulse.at <= 0) {
      void Haptics.impactAsync(IMPACT[pulse.strength]).catch(() => {});
      continue;
    }

    timers.push(
      setTimeout(() => {
        void Haptics.impactAsync(IMPACT[pulse.strength]).catch(() => {});
      }, pulse.at),
    );
  }

  return () => {
    for (const timer of timers) clearTimeout(timer);
  };
}

/** A piece landing. */
export function tickPlacement() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** A row dissolving — the one event the user didn't directly cause. */
export function tickDissolve() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

/** Moving or rotating a piece: a selection change, not an impact. */
export function tickSelection() {
  void Haptics.selectionAsync().catch(() => {});
}

/**
 * Each digit of the 3-2-1 before a somatic movement starts.
 *
 * The one haptic here that marks something the user can already see, which
 * normally would be the argument against it. It earns its place because of what
 * the count is *for*: it is the app saying when to go, to somebody who by then
 * has stood up, crossed their arms, or shut their eyes. A start signal only the
 * people still watching the screen can receive is half a signal.
 *
 * `Light`, like the breath cues, and for the same reason — these are beats to
 * move on, not events landing.
 */
export function tickCountdown() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * A somatic movement's clock reaching zero — and the one haptic in the app that
 * exists because the user is *not* expected to be looking at the screen.
 *
 * That is the whole argument for it. Every other tick here marks something the
 * user can already see: the circle turning over, a piece landing. This one
 * marks the end of two minutes spent looking around a room, or shaking, or with
 * the eyes shut — and without it the only way to know the time is up is to
 * watch the clock, which is the one thing these exercises are asking someone to
 * stop doing. A movement done while watching a countdown is not the movement.
 *
 * `Soft` rather than `Light`, matching `tickDissolve`: like that one, this is
 * the app doing something rather than the user, and the two events the user did
 * not cause should not feel like the ones they did.
 */
export function tickSomaticEnd() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

/**
 * Each beat of a muscle relaxation routine — every "tense now" and every "let
 * go now".
 *
 * The second haptic here that exists because the user is not expected to be
 * looking at the screen, and the one with the strongest case for it. Every
 * routine's own instructions tell people to sit back and let their eyes close,
 * so for most of a run the screen is not being read at all — and unlike the
 * somatic clock, where the only thing being missed is the ending, here a missed
 * boundary means holding a squeeze through the release that was supposed to
 * follow it. The contrast between the two is the exercise.
 *
 * `Light`, like the breath cues rather than like `tickSomaticEnd`: these are
 * beats to move on, not events landing, and there is one every few seconds.
 */
export function tickRelax() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
