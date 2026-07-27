import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
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
