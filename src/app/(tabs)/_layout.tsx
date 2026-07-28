import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';

/**
 * A JS tab bar rather than `NativeTabs`: UIKit gives no control over where the
 * icon sits inside the bar, and this design wants the glyphs lower than the
 * system centers them. See `@/components/tab-bar` for the geometry.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
