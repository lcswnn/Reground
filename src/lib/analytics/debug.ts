/**
 * TEMPORARY. Delete this file and its four call sites before shipping.
 *
 * Everything in `src/lib/analytics/` swallows its failures on purpose — there is
 * no screen in this app that an error about analytics would improve, and a
 * session on a dead network has to be exactly the session that shipped before
 * any of this existed. That is right for a user and useless for finding out why
 * nothing is arriving in the database, because every possible cause looks
 * identical from outside: silence.
 *
 * This is the seam. It logs what was swallowed, without changing what happens.
 *
 * `console.warn` rather than `__DEV__`-gated logging, because the build being
 * debugged is a Release one — `__DEV__` is false there, so anything behind it
 * would be stripped out of exactly the build that needs it. Read the output in
 * Xcode → Window → Devices and Simulators → your phone → Open Console, or in
 * Console.app with the device selected, filtered on `[analytics]`.
 */

const ENABLED = true;

export function trace(step: string, detail?: unknown): void {
  if (!ENABLED) return;

  console.warn(`[analytics] ${step}`, detail === undefined ? '' : detail);
}
