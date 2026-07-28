import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      // The bar matches the page and leans on `shadowColor` for its top edge.
      // A contrasting fill would read as an 83pt panel: iOS centers the icons in
      // the top 49pt and leaves the home-indicator inset below them empty, so a
      // visible block makes the icons look shoved to the top.
      //
      // Opacity still has to be forced, though — iOS turns the bar transparent
      // at a scroll edge (or on a non-scrolling screen), and on iOS 26 it
      // minimizes the bar away as you scroll down.
      backgroundColor={colors.background}
      disableTransparentOnScrollEdge
      minimizeBehavior="never"
      shadowColor={colors.border}
      // Without this the selected icon renders in the system blue, which is the
      // least calm thing on the screen.
      tintColor={colors.brandStrong}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.brandStrong } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'newspaper', selected: 'newspaper.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
