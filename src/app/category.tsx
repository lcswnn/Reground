/**
 * Screen 2 — one question, two answers. The first thing in the app that asks
 * anything of the user, and the first that records anything: `begin` opens the
 * session here.
 *
 * Still no logo and no onboarding. What is in front of this one is the breath,
 * which is deliberate and is explained in `breathe-intro.tsx`: half a minute of
 * something that helps, given before anybody is asked to say what is wrong. So
 * the question lands on a person who has been breathing rather than on one who
 * has just picked the phone up.
 *
 * The back button goes to `/breathe-intro`, not to the breath. This screen had
 * none at all for a while, on the argument that everything behind it is either
 * the door or a breath already taken — but this is the first screen that
 * asks the user for something, and a question with no way back off it reads as
 * a form. The breath's front door is a still page with a Start button, so the
 * cost of pressing back here is a tap rather than another half-minute. See
 * `previousRoute`.
 *
 * Tapping an answer advances immediately rather than arming a Start button.
 * With two options there is nothing to confirm, and the saved tap matters more
 * than the mis-tap does — the back button on the next screen undoes it.
 */

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { CATEGORIES, type Category } from '@/content/categories';
import { ENTRY } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { OptionCard } from '@/session/ui/option-card';
import { OptionList } from '@/session/ui/option-list';
import { SessionScreen } from '@/session/ui/session-screen';
import { needsTopic } from '@/session/routing';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';

export default function EntryScreen() {
  const router = useRouter();
  const { begin } = useSessionFlow();
  const back = useSessionBack('/category');

  const choose = (category: Category) => {
    begin(category);
    // GROUP A gets one more question — which thing — before the rating. GROUP B
    // has nothing to narrow and goes straight through. See `needsTopic`.
    router.replace(needsTopic(category.group) ? '/topic' : '/mood');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <ThemedText type="title">{ENTRY.title}</ThemedText>

        <OptionList>
          {CATEGORIES.map((category) => (
            <OptionCard
              key={category.id}
              label={category.label}
              detail={category.detail}
              onPress={() => choose(category)}
            />
          ))}
        </OptionList>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  // A step wider than the screen gap the rest of the app uses, and the one
  // screen that earns it. The list is ruled now, so what sits under the
  // question is a line rather than the top of a card — and a line at the
  // ordinary distance reads as underlining the question instead of opening the
  // options. The extra step is what separates the two roles.
  root: {
    gap: Spacing.five,
  },
});
