import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Sized to sit with the count rather than to match the tab bar's 24pt glyphs —
 * this one is inline with text, not a target of its own.
 */
const GLYPH_SIZE = 17;

/**
 * Days the reader has shown up, ever. Was the streak counter.
 *
 * The streak had to go, and the reason is that it contradicted the rest of the
 * app. A streak's entire motive force is loss aversion: the number motivates
 * only because breaking it hurts, which makes tomorrow an obligation and makes
 * opening the app after a gap feel like arriving at a scoreboard that has been
 * keeping track of your failure. That is the precise feeling this app exists to
 * be an alternative to — it ends the feed with "now go outside", and then a
 * flame in the corner quietly told you not to.
 *
 * A cumulative total is the same encouragement without the trap. It only ever
 * goes up, a missed week costs nothing, and coming back after a month is met
 * with "31 days" rather than a reset to zero.
 *
 * It is also the argument this app already makes about the world, turned on the
 * reader: days are noisy and the trend is what matters. A streak is a day-level
 * metric. A total is the trend.
 *
 * The old pill had noticed half of this already — it refused to render "0 days"
 * and showed a previous best instead. But "Best: 3 days" is still loss framing.
 * It tells somebody what they used to have.
 */
export function DaysPill({ total }: { total: number }) {
  const theme = useTheme();

  // Nothing to say before the first card has been seen, and "0 days" is exactly
  // the scoreboard this component exists not to be. In practice this lasts one
  // frame: `markCardSeen` runs on mount and takes it straight to 1.
  if (total <= 0) return null;

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.brandSoft }]}
      accessible
      accessibilityLabel={
        total === 1
          ? "Your first day with Reground"
          : `${total} days with Reground`
      }
    >
      {/* A sunrise rather than a flame. The flame was the right glyph for a
          streak — something burning that can go out — and that is the whole
          idea being removed. A sunrise is one per morning, it accumulates, and
          missing one cannot extinguish it. It also matches the palette this app
          was built around and the hour the reminder fires. */}
      <SymbolView
        name="sunrise.fill"
        size={GLYPH_SIZE}
        tintColor={theme.brandStrong}
        // Android and web have no SF Symbols. The count beside it already says
        // what the pill means, so the fallback only has to hold the space
        // without looking like a broken image.
        fallback={
          <View
            style={[
              styles.glyphFallback,
              { backgroundColor: theme.brandStrong },
            ]}
          />
        }
      />

      {total === 1 ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.label}
        >
          First day
        </ThemedText>
      ) : (
        <>
          <ThemedText
            type="small"
            style={[styles.count, { color: theme.brandStrong }]}
          >
            {total}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.label}
          >
            days
          </ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // One state, not two. The old pill went grey when the streak lapsed, which
  // was the design telling somebody they had lost something. There is no lapsed
  // state to draw any more.
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  count: {
    fontSize: 23,
  },
  glyphFallback: {
    width: GLYPH_SIZE - 3,
    height: GLYPH_SIZE - 5,
    borderRadius: Radius.pill,
    opacity: 0.7,
  },
  label: {
    fontSize: 18,
  },
});
