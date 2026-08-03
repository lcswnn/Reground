/**
 * One of the two answers on the first screen.
 *
 * A full-width card rather than a chip: there are only two of them, they carry
 * a line of explanation each, and they are the single most consequential tap
 * in the session — everything downstream branches on which one this is.
 */

import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface OptionCardProps {
  label: string;
  detail: string;
  onPress: () => void;
}

export function OptionCard({ label, detail, onPress }: OptionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText type="subtitle">{label}</ThemedText>
      <ThemedText themeColor="textMuted">{detail}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: Spacing.two,
  },
});
