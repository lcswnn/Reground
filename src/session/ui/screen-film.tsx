/**
 * The matte finish over the whole app: a fixed grain texture, low-opacity and
 * pointer-transparent, standing in for the anti-glare film on an e-reader's
 * screen. It never re-renders and never moves — it is the one layer in the
 * app that is not a screen.
 *
 * `resizeMode="cover"` rather than a tiled repeat: React Native only
 * synthesises `repeat` on iOS, so a tile would go edge-to-edge there and
 * silently stretch to a single tile everywhere else. One image sized to the
 * asset's own portrait aspect and stretched to cover the window reads the
 * same on every platform, at the cost of the grain scaling slightly with
 * screen size — invisible at the opacity this runs at.
 *
 * ## The size has to be said out loud
 *
 * `StyleSheet.absoluteFill` alone is not enough here, and the film spent a
 * while covering only the top-left of the screen because of it. The source is
 * a `require`d local asset, so React Native knows its intrinsic 320×680 and
 * hands Yoga a measure function returning exactly that — which resolves the
 * node's size before the absolute insets ever get a say. The result is a
 * 320×680 patch of grain pinned to the top-left corner on any window bigger
 * than the asset, which is every phone.
 *
 * Explicit `100%`/`100%` retires the measure function and resolves against the
 * wrapper instead, which is the thing actually filling the window. Percentages
 * rather than `useWindowDimensions`, so the film follows rotation and the iPad
 * split-view widths without a re-render.
 */

import { Image, StyleSheet, View } from "react-native";

const grain = require("../../../assets/textures/matte-grain.png");

export function ScreenFilm() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={grain} resizeMode="cover" style={styles.grain} />
    </View>
  );
}

const styles = StyleSheet.create({
  grain: { width: "100%", height: "100%" },
});
