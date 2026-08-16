/**
 * The somatic movements on offer, as data.
 *
 * Same shape and same reasons as `one-more.ts` and `games/catalog.ts`: plain
 * data with no components in it, so the list can be read and tested without a
 * renderer. The mapping from an id to something that runs lives in
 * `session/somatic/`.
 *
 * ## What these are, and what picking them was constrained by
 *
 * Somatic work is the family of exercises that go at anxiety through the body
 * rather than through the thought — the claim is that a nervous system stuck in
 * a threat response can be talked down by giving it the movement it is braced
 * for, or by handing it evidence that nothing is happening. Every entry below
 * is one of the standard ones and each was picked against the same four rules,
 * which are worth writing down because they are what kept the list to six:
 *
 *  1. **It works from where the user already is.** Nothing needs a mat, a ball,
 *     a wall, or a floor to lie on. Four of the six work from a chair without
 *     standing up, and the two that don't say so in their own first line.
 *  2. **It is short.** The sources are consistent that these run in the low
 *     minutes and that duration is not the variable that matters — 90 seconds
 *     to two minutes each, which is also about as long as someone will actually
 *     hold still for at the end of a session they have already given ten to.
 *  3. **It is safe to do alone, from a screen.** This is the rule that cut the
 *     list. Pendulation and titration against real trauma activation, and the
 *     deeper discharge work (conscious connected breathwork, TRE proper), are
 *     specifically the things the somatic literature says want a trained person
 *     in the room. An app cannot notice someone leaving their window of
 *     tolerance, so it should not run the exercises whose safety depends on
 *     somebody noticing.
 *  4. **It is not the breath.** The session opened with a physiological sigh
 *     and "Breathing, another way" is its own entry on the list this one sits
 *     on. Breath-led somatics would be a third helping of the same thing.
 *
 * ## `notice` is not a tip
 *
 * Every entry carries one, and it is the field that makes these somatic rather
 * than stretches. The instruction the sources repeat is that the task is to
 * *notice* what the body is doing, not to make it relax — relaxing is a side
 * effect, and chasing it turns the exercise into one more thing to be failing
 * at. So each `notice` says what there is to pay attention to, and where it
 * applies it says what an unsettling but normal response looks like, because
 * the trembling and the yawning and the sudden tears are the things most likely
 * to make someone stop and think they have broken something.
 *
 * The general rules that apply to all six — go slow, stop if it turns, end on
 * something settled — are not repeated per entry. They are in `SOMATIC_COPY`
 * and shown once, above the list.
 *
 * Order is the order on screen. Orienting is first because it is the one that
 * asks the least: it works sitting down, in public, with nothing to fetch and
 * nothing anyone would see you doing.
 */

export type SomaticId =
  | 'orient'
  | 'shake'
  | 'unclench'
  | 'butterfly'
  | 'hum'
  | 'feet';

export interface SomaticMovement {
  id: SomaticId;
  /** What it is. Named, not described — the blurb does that. */
  title: string;
  /**
   * One line for the card. Opens with what the movement needs of the room —
   * "Sitting", "Standing", "Somewhere you can make a noise" — because that is
   * the thing that decides whether an option is available to someone right now,
   * and finding it out after tapping in is finding it out too late.
   */
  blurb: string;
  /**
   * How long the timer runs. Seconds rather than milliseconds because these are
   * human-scale numbers that the copy quotes back to the user before they start
   * — see `describeDuration`.
   */
  seconds: number;
  /**
   * How to do it, in order. Read on the tutorial screen before starting and
   * kept on screen underneath the clock, so nothing here has to be memorised.
   *
   * Four steps each, which is a ceiling rather than a coincidence: a list long
   * enough to need scrolling is a list nobody follows while moving.
   */
  steps: readonly string[];
  /** What to pay attention to while it runs. See the note above. */
  notice: string;
}

export const SOMATIC_MOVEMENTS: readonly SomaticMovement[] = [
  {
    id: 'orient',
    // "Orienting" is the name for it in the literature and is deliberately not
    // the title: it is a word that has to be explained before it means
    // anything, and the exercise is literally the plain-English version.
    title: 'Look around the room',
    blurb: 'Sitting. Turn your head slowly and let your eyes land on ordinary things.',
    seconds: 120,
    steps: [
      'Stay where you are. Let your head turn slowly to one side, and let your eyes go with it.',
      'Stop wherever something catches your eye. Anything ordinary — a doorframe, a lamp, a corner of the ceiling.',
      'Rest on it for a few seconds. Its colour, its edges, what is behind it.',
      'Turn slowly back the other way and do the same. No faster than that.',
    ],
    notice:
      'Somewhere in this you may yawn, or sigh, or feel your shoulders drop. That is the whole point of it — a slow look around is how you show your body there is nothing here to run from.',
  },
  {
    id: 'shake',
    title: 'Shake it out',
    blurb: 'Standing. Loosen your knees and let a bounce travel up through you.',
    seconds: 90,
    steps: [
      'Stand if you can. Feet about hip-width, knees soft and unlocked.',
      'Start a small bounce from the knees. Heels down or heels lifting, either is fine.',
      'Let your hands and arms go loose and shake them out.',
      'Let the shake spread — arms, shoulders, down through your legs. Loose, not forced.',
    ],
    notice:
      'Your legs may start trembling on their own, and it can feel like it is happening to you rather than being done by you. That is the normal version of this and it is the part that does the work. Slow the bounce down if it gets bigger than you want it.',
  },
  {
    id: 'unclench',
    // The one movement that is mostly about noticing you were already doing
    // something. Named for the release rather than the body parts, which is
    // what the blurb is for.
    title: 'Unclench',
    blurb: 'Sitting. Jaw, then shoulders, then hands — let go of each one.',
    seconds: 120,
    steps: [
      'Let your teeth come apart. A jaw is meant to hang, not to hold.',
      'Roll your shoulders back and down a few times, slowly. Then let them sit wherever they land.',
      'Make a fist with both hands, hold it for about five seconds, and let it go all at once.',
      'Go back through: jaw, shoulders, hands. Most of it will have crept back.',
    ],
    notice:
      'It creeps back without asking, and that is not you doing it wrong. Catching it and letting go again is the exercise — not getting it to stay let go.',
  },
  {
    id: 'butterfly',
    title: 'Butterfly hug',
    blurb: 'Sitting. Cross your arms and tap one side, then the other, slowly.',
    seconds: 120,
    steps: [
      'Cross your arms over your chest, hands resting up near your collarbones.',
      'Tap one hand, then the other. Slow — around one tap a second.',
      'Keep the taps even and let your breathing do whatever it does. Do not count.',
      'If tapping starts to feel like too much, stop tapping and just press gently instead.',
    ],
    notice:
      'Steady touch alternating side to side is what this is made of, and both halves of that are doing something. It is one of the few on this list you can do with a coat on, in a waiting room, without anyone noticing.',
  },
  {
    id: 'hum',
    // The vagus nerve is the mechanism and is deliberately absent from the copy
    // — the same call `GAME_PICKER` makes about "visuospatial", in the other
    // direction. There, the word explains why the step is a game at all. Here it
    // would explain nothing the user can act on: the instruction is "hum", and
    // knowing which nerve it reaches does not change how you do it.
    title: 'Hum',
    blurb: 'Somewhere you can make a noise. Low, steady, until the breath runs out.',
    seconds: 120,
    steps: [
      'Sit up enough that your chest is not folded over. Shoulders down.',
      'Breathe in through your nose. No deeper than is comfortable.',
      'Close your lips and hum out on one low, steady note until the breath runs out.',
      'Let the next breath arrive on its own, then hum again.',
    ],
    notice:
      'You are listening for the buzz — lips, throat, chest. A low note carries further down into the chest than a high one. Under your breath still works if you are not alone.',
  },
  {
    id: 'feet',
    title: 'Feet on the floor',
    blurb: 'Sitting. Press down and find where the floor pushes back.',
    seconds: 90,
    steps: [
      'Put both feet flat on the floor. Shoes off if that is easy from where you are.',
      'Press down through your heels. Then through the balls of your feet. Not hard.',
      'Find where the floor pushes back — the heel, the outside edge, the toes.',
      'Let the weight settle and follow it up: ankles, shins, knees, hips into the chair.',
    ],
    notice:
      'What you are after is the floor holding you up, and that is all. Nothing has to soften and nothing has to change for this one to be working.',
  },
] as const;

export function findMovement(id: SomaticId): SomaticMovement | undefined {
  return SOMATIC_MOVEMENTS.find((movement) => movement.id === id);
}

/**
 * How long a movement runs, said out loud.
 *
 * The tutorial screen promises this before the user commits to it, so it is
 * derived from `seconds` rather than written into the copy twice — the same
 * rule `BREATHE_INTRO.shape` follows for the breath's round count, and for the
 * same reason: being told two minutes and given three is a small lie this app
 * cannot afford to be caught in.
 *
 * Whole minutes are named as minutes and everything else stays in seconds. "1
 * minute 30 seconds" is how a stopwatch says it, not how a person does.
 */
export function describeDuration(seconds: number): string {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  return `${seconds} seconds`;
}

/**
 * The clock on the timer screen, as `m:ss`.
 *
 * Clamped at zero rather than allowed to go negative: the last tick can land
 * after the run has finished by a frame or two, and a timer that briefly reads
 * `-0:01` is the app looking broken at the exact moment it is asking someone to
 * trust it.
 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1_000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
