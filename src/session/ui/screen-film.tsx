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
 */

import { Image, StyleSheet, View } from "react-native";

const grain = require("../../../assets/textures/matte-grain.png");

export function ScreenFilm() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={grain}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
