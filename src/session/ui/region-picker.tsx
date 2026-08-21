/**
 * The one question this app asks about the person using it: which country.
 *
 * Shown once, on the first launch, over the door — see `index.tsx` — and after
 * that only when somebody reopens it from the crisis sheet to change their
 * answer. `region-preference.tsx` holds what was picked, and holds the
 * difference between "not asked yet" and "asked, and not in a country we carry
 * numbers for".
 *
 * ## Why the app asks rather than looks
 *
 * There is a location permission on every phone and it is the wrong tool for
 * this. It would give coordinates for a question that needs a country, it would
 * open a system prompt on the first screen of an app that stores nothing, and
 * it would keep working in the background of somebody's mental model long after
 * the answer was cached. A list and one tap is the smaller thing, and it is the
 * one a person can see the whole of.
 *
 * The device's own locale is read to put a tick on a likely answer — see
 * `guessRegion` — and that is the whole of its authority. A guess is never
 * stored as a choice, because the guess is wrong for anybody travelling, for
 * anybody whose phone is set to another country's English, and for every phone
 * bought secondhand abroad.
 *
 * ## Why it is a sheet and not a screen
 *
 * The door is the app's first impression and it is a still page with one
 * button. A screen in front of it would make the first thing the app does a
 * form. This arrives over the door, is answered in one tap, and leaves — and
 * because it is not part of the session flow there is no route to add, no back
 * target to invent, and nothing to skip past on the way in a second time.
 *
 * There is no dismiss. Every row is an answer, "Somewhere else" included, and
 * a tap on any of them ends it — so the only way to leave is to have answered
 * the question, and the answer costs nothing to give.
 *
 * Where "ends it" goes is the caller's to decide, which is why `onDone` says
 * done rather than close. Over the door it closes; opened from the crisis sheet
 * to change an answer, it hands the reader back to the sheet, because the
 * numbers there are the only thing the answer changes.
 */

import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { CRISIS_REGIONS, guessRegion, type RegionId } from '@/content/crisis';
import { REGION_PICKER } from '@/content/strings';
import { useTheme } from '@/hooks/use-theme';
import { useRegionPreference } from '@/lib/region-preference';
import { useThemePreference } from '@/lib/theme-preference';
import { ScreenFilm } from '@/session/ui/screen-film';

/** The same scrim the crisis sheet uses, for the reason written out there. */
const SCRIM_LIGHT = 'rgba(0, 0, 0, 0.42)';
const SCRIM_DARK = 'rgba(0, 0, 0, 0.62)';

const MAX_WIDTH = 420;

/**
 * What the device thinks, read once at module load.
 *
 * `Intl` rather than a dependency: the resolved locale is already on the phone,
 * it costs nothing, and it cannot fail in a way worth handling — a runtime
 * without `Intl` returns nothing and the list simply arrives with no tick on
 * it, which is the same screen with one less hint.
 */
const SUGGESTED: RegionId | null = (() => {
  try {
    return guessRegion(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
})();

export function RegionPicker({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { region, setRegion } = useRegionPreference();
  const { isDark } = useThemePreference();
  const reducedMotion = useReducedMotion();

  // What to tick: the answer already given, or — the first time — the one the
  // phone suggests. Never a default that would be stored on its own.
  const marked = region ?? SUGGESTED;

  const choose = (next: RegionId) => {
    setRegion(next);
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      // Android's back gesture closes it without an answer, which leaves the
      // question unasked rather than answered wrongly. It will be asked again
      // next launch, which is the right outcome of a dismissal.
      onRequestClose={onDone}
      statusBarTranslucent>
      <View style={styles.root}>
        {/* No pressable scrim, and it is the only sheet in the app without one.
            A tap outside this is far more likely to be a tap meant for a row
            than a considered dismissal, and the cost of getting that wrong is
            an app with no crisis numbers in it. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? SCRIM_DARK : SCRIM_LIGHT },
          ]}
          pointerEvents="none"
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.heading}>
            <ThemedText type="subtitle">{REGION_PICKER.title}</ThemedText>
            {/* The reason, before the question rather than behind a policy —
                see `REGION_PICKER`, which is where the argument for saying it
                out loud is written down. */}
            <ThemedText type="small" themeColor="textSecondary">
              {REGION_PICKER.lead}
            </ThemedText>
          </View>

          <ScrollView
            contentContainerStyle={styles.list}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}>
            {CRISIS_REGIONS.map((option) => {
              const ticked = option.id === marked;

              return (
                <PressableScale
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ticked }}
                  accessibilityLabel={option.name}
                  depth="card"
                  onPress={() => choose(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: ticked
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    },
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="defaultSemiBold">{option.name}</ThemedText>
                </PressableScale>
              );
            })}
          </ScrollView>

          <ThemedText type="small" themeColor="textMuted">
            {REGION_PICKER.elsewhereNote}
          </ThemedText>
        </View>

        {/* The matte film, because a native modal is its own window — the same
            reason the crisis sheet draws one. */}
        <ScreenFilm />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: '86%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  // Filled rows, like the crisis sheet's: these are actions rather than answers
  // to a question about the user, and a fill is what says so.
  option: {
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
