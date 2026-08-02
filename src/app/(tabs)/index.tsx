import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Breathe — the first thing the app opens on, and deliberately empty for now.
 *
 * This is the index route rather than a named one because it is where somebody
 * arriving stressed should land: the tab bar's first item and the group's
 * default URL have to be the same screen, or the app opens on a tab that isn't
 * lit. The old Today screen moved to `/today` to make room; it still works and
 * is still in the navigator, just no longer on the bar.
 *
 * Nothing here yet by design — the breathing exercise is the next piece of
 * work, and a placeholder that says so beats one that pretends.
 */
export default function BreatheScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="title">Breathe</ThemedText>
        </View>

        <View style={styles.center}>
          <ThemedText type="small" themeColor="textMuted" style={styles.note}>
            Nothing here yet.
          </ThemedText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  note: { textAlign: 'center' },
});
