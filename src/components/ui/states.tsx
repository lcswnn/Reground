import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      {/* `brandStrong`, not `brand`: a spinner is a foreground mark, and in
          light mode `brand` is a tan fill only a shade off the sand page. */}
      <ActivityIndicator color={theme.brandStrong} />
      <ThemedText type="small" themeColor="textMuted">
        {label}
      </ThemedText>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.center}>
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
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.five,
  },
});
