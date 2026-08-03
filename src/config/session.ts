/**
 * Every number the session is tuned by.
 *
 * Nothing in `src/session/` or `src/app/session/` hard-codes a duration or a
 * threshold — they all come from here, so the experience can be re-tuned
 * without reading a component.
 */

/** The 0–10 scale used for both mood questions. 10 is the bad end. */
export const MOOD_SCALE = {
  min: 0,
  max: 10,
} as const;

/**
 * At or above this, the user is treated as being in high distress. Two things
 * key off it: the reactivation cue is skipped entirely before the session, and
 * a pointer to real support is surfaced after it.
 */
export const HIGH_DISTRESS_MOOD = 8;

/**
 * How many points `moodAfter` has to fall below `moodBefore` before we call it
 * a real change rather than noise. One point on a self-report scale is inside
 * the margin of "I answered it differently the second time".
 */
export const MEANINGFUL_MOOD_DROP = 2;

/**
 * Cyclic sighing: two inhales stacked, then an exhale about twice their
 * combined length. The exhale is the part that does the work, so the ratio is
 * the thing to preserve if these ever move — lengthening an inhale without
 * moving the exhale makes it a slower breath, not a calmer one.
 *
 * One cycle is 14.5s. `totalMs` is a target rather than a hard stop — the
 * screen runs whole cycles and ends on the nearest one, so a minute here is
 * four cycles and about 59 seconds including the lead-in. Cutting off
 * mid-exhale to hit exactly 60 would be worse than missing it.
 */
export const BREATHING = {
  totalMs: 60_000,
  /**
   * Stillness before the first inhale.
   *
   * The screen arrives on a fade, and an animation that starts on mount is
   * already a third of the way into the inhale by the time the screen is fully
   * visible — so the first thing the user sees is a circle mid-movement with
   * no idea when it began, and they spend the first cycle catching up. This
   * holds the circle small and empty until the transition has finished, so the
   * breath starts where the user can see it start.
   */
  leadInMs: 1_400,
  firstInhaleMs: 3_000,
  /**
   * The top-up. Short and sharp is the point of it — it reinflates what the
   * first inhale left collapsed, which is what makes the long exhale actually
   * offload anything. A slow second inhale is just one long inhale with a
   * stumble in it.
   */
  secondInhaleMs: 800,
  /**
   * The beat at the top, on a full chest. Long enough to be a rest rather than
   * a hinge between two movements.
   */
  holdMs: 1_500,
  exhaleMs: 8_200,
  /** Room to land at the bottom before being asked to start again. */
  restMs: 1_000,
} as const;

export const BREATH_CYCLE_MS =
  BREATHING.firstInhaleMs +
  BREATHING.secondInhaleMs +
  BREATHING.holdMs +
  BREATHING.exhaleMs +
  BREATHING.restMs;

/**
 * The puzzle.
 *
 * NOTE ON DOSE: the trials this mechanic comes from (visuospatial task after
 * an intrusive image) ran the task considerably longer than five minutes —
 * typically 10–20 minutes, sometimes with a re-dose the following day. Five is
 * a guess at what someone will actually sit through on a phone right after
 * being upset, not a clinically supported number. This is the single most
 * likely thing in the app to need tuning once there is real usage data.
 */
export const PUZZLE = {
  /** GROUP A — the puzzle is one step among several. */
  standardMs: 5 * 60_000,
  /** GROUP B — the puzzle is the point of the session, so it runs longer. */
  witnessedMs: 7 * 60_000,
  /** Added each time the user chooses "keep going". */
  keepGoingMs: 3 * 60_000,
  columns: 6,
  rows: 9,
} as const;
