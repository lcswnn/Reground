/**
 * A short ink stroke: the mark this app frames a heading with.
 *
 * Two screens draw one — the opening title card in `stage-direction.tsx`, where
 * a pair of them hold the line between, and the breath's intro, where one sits
 * under the title with the explanation beneath it. Extracted the moment the
 * second one wanted it, because two copies of a mark this specific would agree
 * on the day they were written and nowhere after that.
 *
 * ## Why it is not the app's other line
 *
 * The rest of the app rules at `hairlineWidth * 2` in `border` — ink at 20%,
 * a third of a point on a 3× screen. That is right for a line whose job is to
 * separate two things without being looked at: the edge of a card, the top of
 * the tab bar. This one is the opposite. It is a frame rather than a divider,
 * half of what makes a title read as placed rather than left there, and at a
 * hairline in `border` it was a rumour.
 *
 * So: ink, two points, rounded ends. Full ink means it inverts with the theme
 * on its own — ink on paper in light, paper on ink in dark — carrying the same
 * weight as the heading it belongs to in either. The rounded ends are what keep
 * a short heavy line from reading as a divider someone cropped.
 *
 * Deliberately far shorter than the text it marks. A rule that runs the measure
 * is a divider between things, and neither screen has anything to divide.
 */

import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Fixed rather than a share of the line it sits with, because those lines wrap:
 * a rule sized to its text would be one length on a phone and another on a
 * tablet. This is a mark, not a measurement.
 */
const RULE_WIDTH = 64;
const RULE_HEIGHT = 2;

export function Rule() {
  const theme = useTheme();

  return <View style={[styles.rule, { backgroundColor: theme.text }]} />;
}

const styles = StyleSheet.create({
  // No alignment of its own: centred inside a centred column, left inside a
  // left-aligned one. Both callers want it to follow the text it belongs to.
  rule: {
    width: RULE_WIDTH,
    height: RULE_HEIGHT,
    borderRadius: RULE_HEIGHT / 2,
  },
});
