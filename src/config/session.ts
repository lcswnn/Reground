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
 * The splash, which is the one number in this file that isn't part of the
 * session — it is over before the session starts. It lives here anyway, because
 * the alternative is a duration hard-coded in a component, and that is the rule
 * this file exists to keep.
 *
 * A floor, not a delay: the splash is held until the app has been open this
 * long, so time spent loading fonts counts towards it rather than being added
 * to it. On a warm start where everything is ready immediately, this is the
 * whole of what is on screen; on a cold one it may already have passed by the
 * time the fonts land, and nothing waits.
 *
 * It is deliberately longer than it needs to be. The screen after it asks the
 * user to take a breath, and arriving there half a second after tapping the
 * icon undercuts that before it has been read — the app is asking someone to
 * slow down, and the first thing it does should not be to hurry.
 *
 * `hideMs` is the fade out, and has to match `SplashScreen.setOptions` in
 * `app/_layout.tsx` — it is written down here so the total is a number rather
 * than a guess. It is load-bearing beyond that call now: the welcome line waits
 * out this fade before it starts, so a value here that does not match what the
 * splash actually does would have the line begin over the tail of it. See
 * `splashClearsInMs`.
 */
export const SPLASH = {
  minimumMs: 1_400,
  hideMs: 350,
} as const;

/**
 * The opening line, which nobody taps through.
 *
 * The line arrives whole and then sits there. It used to write itself out a
 * character at a time, on the argument that a sentence arriving at reading speed
 * sets the pace of the breath it is asking for — `charMs` and `charFadeMs` were
 * the pace of that hand. The typing was the only moving thing on a screen whose
 * whole point is that nothing is being asked of you yet, and a line still
 * assembling itself is a line you are waiting on rather than reading. So it is
 * simply there now, and the hold does all the work.
 *
 * `holdMs` is that work: long enough to take the breath the line asks for, short
 * enough that someone who ignored it isn't left waiting on an app that won't
 * move. It briefly absorbed the time the writing used to take, which made this
 * screen as long as it had ever been while having less on it than ever — five
 * and a half seconds is a long time to hold four words nobody can act on. The
 * hold is what came back down.
 *
 * `fadeInMs` is not the line being written, it is the line being turned up. It
 * starts once the splash has gone rather than while it is dissolving (see
 * `splashClearsInMs`), so the line comes up on a screen that is already clear.
 * The two fades used to overlap, which read as the app talking over itself on
 * the way out of its own front door.
 *
 * Everything else in the session waits for a tap. This one doesn't, which is
 * why the total is derived here rather than being whatever the animation
 * happened to add up to.
 */
export const WELCOME_BREATH = {
  fadeInMs: 400,
  holdMs: 1_850,
  fadeOutMs: 700,
} as const;

/**
 * How long the whole screen lasts.
 *
 * A constant now rather than a function of the line's length — nothing here
 * scales with the number of characters any more, which is most of the point of
 * the line being solid.
 */
export const WELCOME_BREATH_MS =
  WELCOME_BREATH.fadeInMs + WELCOME_BREATH.holdMs + WELCOME_BREATH.fadeOutMs;

/**
 * Cyclic sighing: two inhales stacked, then an exhale about twice their
 * combined length. The exhale is the part that does the work, so the ratio is
 * the thing to preserve if these ever move — lengthening an inhale without
 * moving the exhale makes it a slower breath, not a calmer one.
 *
 * One cycle is 11.2s. `totalMs` is a target rather than a hard stop — the
 * screen runs whole cycles and ends on the nearest one, so a minute here is
 * four cycles and about 46 seconds including the lead-in. Cutting off
 * mid-exhale to hit exactly 60 would be worse than missing it.
 *
 * That rounding has a cliff in it, which `firstInhaleMs` documents: shorten a
 * phase far enough and four rounds becomes five, and the breath gets *longer*.
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
  /**
   * The first inhale — full, but taken rather than drawn out.
   *
   * Was 2.5s, which is a long time to be filling one lungful, and it left people
   * arriving at the top-up already wanting to breathe out. The sigh is two
   * inhales *stacked*; the first one filling briskly is what leaves room for the
   * second to be a real top-up rather than a formality.
   *
   * ## Two floors, and the lower one bites first
   *
   * `secondInhaleMs` is the obvious one: these two have to stay clearly
   * different lengths, or the shape stops being a long inhale and a snatched one
   * and becomes a single interrupted inhale. At 1.8s this still runs 2.6× the
   * top-up.
   *
   * The one that actually binds is arithmetic, and it is not obvious at all.
   * `BREATH_CYCLES` rounds `totalMs` to whole cycles, so shortening a phase
   * shortens the cycle until the rounding tips — below about **1,712ms** here,
   * four rounds becomes five and the whole breath jumps from ~46s to ~57s. A
   * faster inhale would make the session a third longer. If this needs to come
   * down further, move `totalMs` in the same commit.
   */
  firstInhaleMs: 1_800,
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
    // Five beats, still even, now 360 each rather than 500 — `firstInhaleMs`
    // came down and these have to re-tile it exactly or Tully drifts a little
    // further from the circle every cycle. Five and not four: `brim` is the top
    // of the first inhale and the only phase it appears in, so dropping a beat
    // here would drop a drawing out of the app entirely.
    firstInhale: [360, 360, 360, 360, 360],
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
  /** The calm shelf — the game is one step among several, and claims nothing. */
  standardMs: 5 * 60_000,
  /**
   * The visuospatial shelf — the game is the point of that session, so it runs
   * longer. Named for the shelf rather than the group since `puzzleDurationMs`
   * stopped keying on the group: the dose follows the mechanism, and only the
   * visuospatial games have one.
   */
  visuospatialMs: 7 * 60_000,
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
