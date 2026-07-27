import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.brand} />
      <ThemedText type="small" themeColor="textMuted">
        {label}
      </ThemedText>
    </View>
  );
}

export function EmptyState({
  emoji = '🌱',
  title,
  message,
}: {
  emoji?: string;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.center}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="sectionTitle" style={styles.centered}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <ThemedText style={styles.emoji}>🌤️</ThemedText>
      <ThemedText type="sectionTitle" style={styles.centered}>
        Could not load this
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        {error.message}
      </ThemedText>
      {onRetry ? (
        <View style={styles.action}>
          <Button title="Try again" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  emoji: {
    fontSize: 40,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.five,
  },
});
