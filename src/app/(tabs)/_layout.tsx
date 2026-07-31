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

      {/* In the navigator, absent from the bar. `href: null` is what keeps the
          bar on screen with nothing selected while the archive is open — the
          reader can see they have stepped outside the four tabs, and any tab is
          the way back.

          Note for anyone reading this alongside `@/components/tab-bar`: expo-router
          implements `href: null` by rewriting it into `tabBarButton` and a
          `display: 'none'` item style, both of which only the *default* bar
          reads. A hand-rolled bar sees an ordinary route and has to exclude it
          itself, which is what `BAR_ROUTES` over there does. */}
      <Tabs.Screen name="archive" options={{ title: 'Archive', href: null }} />
    </Tabs>
  );
}
