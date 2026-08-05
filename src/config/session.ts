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
  totalMs: 50_000,
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
  firstInhaleMs: 2_500,
  /**
   * The top-up. Short and sharp is the point of it — it reinflates what the
   * first inhale left collapsed, which is what makes the long exhale actually
   * offload anything. A slow second inhale is just one long inhale with a
   * stumble in it.
   */
  secondInhaleMs: 700,
  /**
   * The beat at the top, on a full chest. Long enough to be a rest rather than
   * a hinge between two movements.
   */
  holdMs: 1_500,
  exhaleMs: 6_200,
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
 * How many whole cycles the breath actually runs — `totalMs` rounded to the
 * nearest one, since the screen never cuts off mid-breath.
 *
 * Derived rather than written down twice: the intro screen tells the user this
 * number before they start, and a promise of four rounds followed by five is
 * exactly the kind of small lie this app cannot afford. `strings.test.ts` holds
 * the rest of that copy against the numbers above.
 */
export const BREATH_CYCLES = Math.max(
  1,
  Math.round(BREATHING.totalMs / BREATH_CYCLE_MS),
);

/**
 * Tully, who breathes along with the circle.
 *
 * Tully is drawn, not animated: nine poses, and the breath is which one is on
 * screen. `poseMs` gives each pose its share of the phase it belongs to — one
 * array per phase, in cycle order, and each array has to sum to that phase's
 * duration above. `tully-cycle.test.ts` holds that invariant, because the
 * failure mode of breaking it is Tully quietly falling out of step with the
 * circle rather than anything throwing.
 *
 * Only the way up was drawn. The exhale walks the same poses back down, which
 * is why the counts below are lopsided in the way they are: eight beats climb,
 * and seven come back down over more than twice the time. Slower on the way
 * down is the point — the exhale is the long phase, and a Tully who finished
 * deflating early would leave the user still breathing out at a Tully who had
 * stopped.
 *
 * `secondInhale` is the tight one: three beats inside 700ms, which is roughly
 * twice the shimmer rate below. That is the fastest anything here moves, and it
 * is deliberate — the top-up is a snatched breath, and drawn at first-inhale
 * pace it would read as one long inhale with a stumble in it. If it ever needs
 * to breathe more, `BREATHING.secondInhaleMs` is the number to move, not this
 * one; these only decide how that phase is divided up.
 *
 * The hold is a single beat on purpose. Splitting it would start Tully
 * deflating during the phase whose whole job is that nothing moves, so the top
 * drawing keeps all of it and the first step down belongs to the exhale.
 */
export const TULLY = {
  /**
   * How long one of the three hand-drawn outlines holds before the next.
   * ~8fps, which is the rate the wobble was drawn at — faster reads as noise,
   * slower reads as a stutter.
   */
  shimmerMs: 120,
  poseMs: {
    firstInhale: [500, 500, 500, 500, 500],
    secondInhale: [235, 235, 230],
    hold: [1_500],
    exhale: [800, 850, 880, 900, 900, 920, 950],
    rest: [1_000],
  },
} as const;

/**
 * The 5-4-3-2-1's crossfade: out, a beat of nothing, in.
 *
 * The beat is the part that matters. A straight cut, or a fade with no gap
 * between the two halves, makes the prompts feel like pages being turned by
 * someone waiting for you to finish. The empty moment is what makes it read as
 * one thing settling before the next arrives — which is the pace the exercise
 * is supposed to be done at.
 *
 * In is slower than out for the same reason: leaving is quick, arriving takes
 * its time.
 */
export const GROUNDING_FADE = {
  outMs: 260,
  holdMs: 140,
  inMs: 460,
} as const;

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
  /**
   * How many rows dissolve from the bottom when the stack reaches the top.
   *
   * A third of the board: enough that there is somewhere to put the next few
   * pieces without having to think about it, and little enough that the stack
   * the player built is still recognisably theirs afterwards. See
   * `dissolveLowest` — this is the no-fail rule, as a number.
   */
  overflowRows: 3,
} as const;
