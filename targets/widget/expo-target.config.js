/**
 * The WidgetKit extension target.
 *
 * `@bacons/apple-targets` reads this at prebuild and generates a real Xcode
 * extension target from it, so `ios/` stays disposable and gitignored the way
 * the rest of the native project is — there is no "eject" step here and no
 * committed Xcode file to hand-merge later.
 *
 * Deliberately no App Group. The usual widget architecture shares a container
 * because the extension cannot reach the app's authenticated session — but this
 * widget does not need one: the humanity artifact is a public static JSON on
 * Supabase Storage, so the extension fetches it directly. That is what keeps the
 * widget correct when somebody has not opened the app in a fortnight, which is
 * exactly the case a widget exists to serve.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "widget",
  // Must differ from the app target's name. Xcode derives each target's
  // intermediates directory from it, so two targets called "Mellova" compile
  // their asset catalogs to the same path and the build fails with "multiple
  // commands produce conflicting outputs". What the user actually reads in the
  // widget gallery is `configurationDisplayName` in index.swift, not this.
  name: "MellovaWidget",
  // Matches the app's brand terracotta, and is what SwiftUI's `AccentColor`
  // resolves to inside the extension.
  colors: {
    $accent: "#e08659",
  },
  // WidgetKit's `containerBackground` modifier — which iOS 17 requires for a
  // widget to render at all rather than being blanked — does not exist below 17.
  deploymentTarget: "17.0",
};
