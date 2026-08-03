import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';

/**
 * A JS tab bar rather than `NativeTabs`: UIKit gives no control over where the
 * icon sits inside the bar, and this design wants the glyphs lower than the
 * system centers them. See `@/components/tab-bar` for the geometry.
 *
 * Three tabs, and the middle one is the only one with anything in it yet:
 * Breathe and Play are placeholders for the cool-down work, Read is the day's
 * news batch that already existed. Read keeps the route name `feed` — that is
 * the URL and what `router.navigate('/feed')` refers to from the archive, so
 * only the label changed.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Breathe' }} />
      <Tabs.Screen name="feed" options={{ title: 'Read' }} />
      <Tabs.Screen name="play" options={{ title: 'Play' }} />

      {/* In the navigator, absent from the bar. `href: null` is what keeps the
          bar on screen with nothing selected while one of these is open — you
          can see you have stepped outside the three, and any tab is the way
          back.

          `today`, `progress` and `profile` are here rather than deleted: they
          are the old app's screens and still work, but they belong to the
          paradigm we're moving away from, so they come off the bar first and
          get decided on separately. Note that this leaves `/settings` reachable
          only through `profile`, which nothing now links to.

          Note for anyone reading this alongside `@/components/tab-bar`:
          expo-router implements `href: null` by rewriting it into `tabBarButton`
          and a `display: 'none'` item style, both of which only the *default*
          bar reads. A hand-rolled bar sees an ordinary route and has to exclude
          it itself, which is what `BAR_ROUTES` over there does. */}
      <Tabs.Screen name="today" options={{ title: 'Today', href: null }} />
      <Tabs.Screen name="progress" options={{ title: 'Trends', href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'You', href: null }} />
      <Tabs.Screen name="archive" options={{ title: 'Archive', href: null }} />
    </Tabs>
  );
}
