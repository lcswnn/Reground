/**
 * Screen 1 — one question, two answers. The start of the session proper.
 *
 * Still no logo and no onboarding: the screen in front of this one (`index.tsx`)
 * is a door, not a welcome, and someone arriving here has already had enough
 * happen to them today.
 *
 * Tapping an answer advances immediately rather than arming a Start button.
 * With two options there is nothing to confirm, and the saved tap matters more
 * than the mis-tap does — the next screen carries a way back for that, and it
 * is the only screen in the session that does.
 */

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { CATEGORIES, type Category } from '@/content/categories';
import { ENTRY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { OptionCard } from '@/session/ui/option-card';
import { SessionScreen } from '@/session/ui/session-screen';
import { needsTopic } from '@/session/routing';
import { useSessionFlow } from '@/session/session-context';

export default function EntryScreen() {
  const router = useRouter();
  const { begin } = useSessionFlow();

  const choose = (category: Category) => {
    begin(category);
    // GROUP A gets one more question — which thing — before the rating. GROUP B
    // has nothing to narrow and goes straight through. See `needsTopic`.
    router.replace(needsTopic(category.group) ? '/topic' : '/mood');
  };

  return (
    <SessionScreen centered>
      <View style={styles.root}>
        <ThemedText type="title">{ENTRY.title}</ThemedText>

        <View style={styles.options}>
          {CATEGORIES.map((category) => (
            <OptionCard
              key={category.id}
              label={category.label}
              detail={category.detail}
              onPress={() => choose(category)}
            />
          ))}
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.five,
  },
  options: {
    gap: Spacing.three,
  },
});
