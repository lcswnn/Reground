import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatDay, todayISO } from '@/lib/format';

/**
 * Today's date, centered, at the top of every tab.
 *
 * It used to sit on Today alone, left-aligned above the greeting. Repeating it
 * across the app makes it a masthead rather than a label on one screen — the
 * same line in the same place on every page, the way a paper puts the date at
 * the top of every sheet. It also quietly reinforces the thing the Feed tab is
 * now built around: what you are reading belongs to a particular day, and the
 * day ends.
 */

/**
 * Wider than `eyebrow`'s own 1.1. At this size the tracking is what separates a
 * date from a label — it reads as a masthead rather than as a caption on the
 * title below it.
 */
const LETTER_SPACING = 2.4;

export function DateHeader() {
  return (
    <ThemedText type="eyebrow" themeColor="textMuted" style={styles.date}>
      {formatDay(todayISO())}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  date: {
    textAlign: 'center',
    letterSpacing: LETTER_SPACING,
    /**
     * Optical centering, not a nudge.
     *
     * Letter spacing is applied *after* every glyph including the last, so the
     * measured width carries one trailing gap that has no ink in it. Centering
     * that width therefore sits the visible text half a gap left of true
     * center — small, but on a centered line under a centered layout it is
     * exactly the kind of misalignment you can see without being able to name.
     *
     * Padding rather than a margin: it narrows the content box from the left,
     * which moves the centered line right by half of it — the correction
     * needed, from the value that caused it.
     */
    paddingLeft: LETTER_SPACING,
  },
});
