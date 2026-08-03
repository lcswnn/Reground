/**
 * Haptics, wrapped so a failure is never louder than the thing it was marking.
 *
 * Every call is fire-and-forget: on a device with haptics turned off, or an
 * Android build without the vibrate permission, these reject, and an unhandled
 * rejection mid-breath is a worse outcome than a missing tick.
 *
 * Three events use haptics in this app and no others: the top of each inhale,
 * the start of each exhale, and placing a puzzle piece. All three are moments
 * where something actually changed.
 */

import * as Haptics from 'expo-haptics';

/** The breath cues. Deliberately the lightest thing available. */
export function tickBreath() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
