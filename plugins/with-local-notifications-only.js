const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Drops the `aps-environment` entitlement that `expo-notifications` adds.
 *
 * That entitlement declares the **Push Notifications** capability — remote pushes
 * delivered through APNs. This app has never sent one and has no server that
 * could: the daily reminder is a *local* scheduled notification, produced on the
 * device by `src/lib/daily-reminder.ts`, and local notifications need only the
 * user's permission. See the note at the top of that file for why the reminder is
 * local rather than pushed.
 *
 * Without this, a device build fails outright on a personal Apple team:
 *
 *   Provisioning Profile "iOS Team Provisioning Profile: *" does not support the
 *   Push Notifications capability.
 *
 * Free teams cannot hold that capability at all, so the alternative would be a
 * paid Apple Developer account bought purely to declare something unused.
 *
 * Must be listed **first** in `app.json`, before `expo-notifications`. Mods for a
 * given file chain such that the *last registered runs first*, so being early in
 * the array is what makes this run last and therefore win. Listed after
 * `expo-notifications` it silently does nothing: the delete happens, and then
 * `withNotificationsIOS` — which only writes the key when it is absent — puts it
 * straight back.
 *
 * If push is ever genuinely needed, delete this plugin rather than working around
 * it; the entitlement comes back on its own.
 */
module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
