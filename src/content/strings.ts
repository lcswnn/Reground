/**
 * Every user-facing string in the session flow.
 *
 * All of it is a first draft — rewrite freely, nothing here is load-bearing for
 * logic. Two rules it was written under, which are worth keeping:
 *
 * 1. Plain and short. No "take a moment", no "your journey", no gentle
 *    tricolons. Say the thing.
 * 2. Never tell the user they are wrong to feel bad. The app's claim is that
 *    the loop can be interrupted, not that the feeling is a mistake.
 */

/**
 * The door. One line and one button, and the button is the answer to the line
 * rather than a "continue" — nobody arrives here needing to be eased in, but
 * naming the thing they were just doing is a different move from asking them to
 * file it.
 */
export const WELCOME = {
  title: "Hey, how are you today?",
  /**
   * Says it for them. The whole point is that it should be recognisable enough
   * to be pressed without being thought about — the question that actually
   * branches the session is on the next screen.
   */
  action: "I\'m feeling a bit anxious right now.",
} as const;

/**
 * The back button, top-left on every screen that has somewhere to go back to.
 *
 * A word as well as the arrow. The arrow alone is a fine icon on a screen that
 * is already a page; on a screen that is one question and a scale it is just
 * another mark to decode.
 */
export const BACK = {
  arrow: "←",
  label: "Back",
} as const;

/**
 * The tap-for-more control, on the two screens that ask something of the user
 * without the reason fitting on the screen.
 */
export const DISCLOSURE = {
  /** Points along the line when closed, down into the text when open. */
  chevron: "›",
} as const;

export const ENTRY = {
  /** No logo, no onboarding. Straight to why they opened this. */
  title: "What seemed to trigger that anxiety?",
} as const;

/**
 * The follow-up, for GROUP A only.
 *
 * Four words, and no explanation of why it is being asked. "So we can show you
 * the right numbers" would be a promise made before anything has been shown,
 * and it turns a question into a transaction — the answer is the same either
 * way, and the screen that uses it will make the case for itself.
 */
export const TOPIC = {
  title: "What's it about?",
} as const;

export const MOOD_BEFORE = {
  question: "How are you feeling right now?",
  moodLowLabel: "okay",
  moodHighLabel: "awful",
  continue: "Next",
  /**
   * Labels the answer that is echoed back above the scale. It used to sit
   * beside a "change that" link; changing it is now the back button's job, so
   * the line is left doing only the thing it was always better at — reminding
   * the user which question this rating is about.
   */
  answerPrefix: "Your answer:",
} as const;

export const REACTIVATION = {
  /**
   * Deliberately not a request to describe or type anything — bringing the
   * image to mind is the whole ask, and putting words to it is a different and
   * much heavier task.
   *
   * "Before we begin" now points at the game rather than at the session, which
   * is already underway by the time this is read — the breath runs first. Worth
   * keeping in mind if this line is rewritten again: whatever it says it comes
   * before had better be the screen that actually follows it.
   */
  body: "Now, start to think about that image or video that's stuck in your mind.",
  /**
   * The one screen in the session that deliberately makes someone feel worse,
   * so it is the one that most owes an answer to "why should I". Behind a tap:
   * someone who just wants it over with should not have to read a rationale
   * first, and someone who wants to know why should not have to take it on
   * trust.
   */
  explainLabel: "Why are you asking me to do this?",
  /**
   * Plain mechanism, no jargon. "Reconsolidation" is the word for it and is
   * deliberately absent — unlike "visuospatial" on the game picker, it names
   * something the user can do nothing with, and this screen is already asking
   * enough of their attention.
   */
  why: "Holding it in mind for a moment makes the memory briefly unsteady. The game after this competes for the same part of your head, and that seems to be what does the work.",
  /**
   * The honest half, and the reason the screen exists rather than being cut for
   * being unpleasant. Hedged on purpose — "seems to" and "in the trials" are
   * load-bearing. See `CALIBRATION_COPY`'s rule: a claim only works here if the
   * user could go and check it and find it holds.
   */
  whyEvidence:
    "In the trials this comes from, the game on its own didn't help. It only worked after a reminder like this one. That's the whole reason we ask.",
  ready: "Ready",
} as const;

export const BREATHE_INTRO = {
  /**
   * Names the exercise. "Cyclic breathing" is a real technique with real
   * evidence behind it, and saying so is worth more than a softer line would
   * be — it tells the user this is a method, not a mood.
   */
  body: "Okay, let's begin with some physiological sigh breathing.",
  /**
   * Behind a tap, not on the screen. Someone who already knows the technique,
   * or who just wants the minute to start, should see a title and a button —
   * and a paragraph of instruction is the last thing to hand a person who
   * opened this app because they were wound up.
   */
  explainLabel: "What is a physiological sigh?",
  /**
   * What the breath is, in the two lines it takes to say it.
   *
   * Naming the technique is not the same as explaining it, and this screen was
   * doing only the first. Someone about to hand a minute to an app is owed the
   * shape of what they are copying before the circle starts moving — the
   * `leadInMs` hold exists because arriving mid-inhale means spending the first
   * cycle working it out, and reading it beforehand removes the rest of that.
   *
   * The nose and the mouth are how the sigh is actually done, and the on-screen
   * cues ("In", "In again", "Out") have never had room to say so.
   */
  method:
    "Physiological sigh: one shorter inhale, followed by a second quick inhale through the nose, then one long exhale through your mouth.",
  /**
   * The other half of "what to expect": how long, and what to watch.
   *
   * The count comes from `BREATH_CYCLES` rather than being written out, so the
   * promise can't drift from the timings in `@/config/session`. "About a
   * minute" is held to `BREATHING.totalMs` by `strings.test.ts` for the same
   * reason — being told a minute and given two is worse than being told
   * nothing.
   */
  shape: (rounds: number) =>
    `${rounds} rounds, about a minute. The circle grows as you breathe in and shrinks as you breathe out, and Tully breathes with it.`,
  /** Under the button, quiet. The screen waits: nothing starts on arrival. */
  hint: "Tap start to begin.",
  start: "Start",
} as const;

export const BREATHING_COPY = {
  inhale: "In",
  secondInhale: "In again",
  exhale: "Out",
  /** Low-emphasis on purpose. It exists; it is not the thing to look at. */
  skip: "skip",
} as const;

export const GAME_PICKER = {
  /**
   * Names the mechanism rather than hiding it. "Visuospatial" is a real word
   * doing real work here — it is *why* this step is a game and not a coping
   * tip, and someone who wants to look it up should be able to.
   */
  title: "Now, let's pick a visuospatial game to take your mind off things:",
  /** Above the paid list. Not a pitch — a label. */
  lockedHeading: "Reground Plus",
  lockedNote: "Not available yet.",
  /** Read out with a locked card; never shown as a badge with its own line. */
  lockedLabel: "Locked",
} as const;

export const PUZZLE_COPY = {
  /** Fallback only — the play screen titles itself from the chosen game. */
  title: "Fit the shapes.",
  /** GROUP A — a normal step in the sequence. */
  worldFraming: "A few minutes of this. No score, no way to lose.",
  /**
   * GROUP B — this is the step that matters, and we say why.
   *
   * Says nothing about buttons or shapes, and it used to. There are eight games
   * behind this screen now and the framing is shown above all of them, so a line
   * that explains one of them is wrong seven times out of eight. Each game says
   * what to do in its own words, on its own screen.
   *
   * Kept to two lines on a phone, which is a layout constraint as much as an
   * editing one: this sits directly above the game and every line of it is a
   * line the board underneath does not get. A third line took a row off the
   * falling-blocks grid.
   */
  witnessedFraming: "A few minutes of this. It competes with the picture in your head.",
  rotate: "Rotate",
  place: "Place",
  left: "Left",
  right: "Right",
  done: "I'm done",
  keepGoing: "Keep going",
  timeUpPrompt: "That's the time. You can stop here or stay a while longer.",
} as const;

/**
 * The judgement games — Rotation Match, Paper Fold, Net Fold, Hidden Cubes.
 *
 * These are the only screens in the app that tell anyone they got something
 * wrong, and the wording is where that is kept survivable: it is about the
 * answer, never about the person. "It was this one", not "wrong". See the note
 * at the top of `games/ui/trial.tsx` for why they say anything at all.
 */
export const TRIAL = {
  right: "Yes.",
  wrong: "It was this one.",
} as const;

export const ROTATION_MATCH = {
  prompt: "Same shape turned, or a mirror of it?",
  same: "Same, turned",
  mirror: "Mirrored",
  /** Read out in place of the grids, which mean nothing to a screen reader. */
  figureLabel: "The first figure",
  candidateLabel: "The second figure",
} as const;

export const PAPER_FOLD = {
  prompt: "Folded, then punched through. Which sheet is it, opened out?",
  /** Between the fold steps. */
  arrow: "→",
  option: (n: number) => `Sheet ${n}`,
  sheetLabel: "The sheet, flat",
  foldLabel: (n: number) => `Folded ${n === 1 ? "once" : `${n} times`}`,
  punchedLabel: "The folded sheet, with the hole punched through it",
} as const;

export const NET_FOLD = {
  prompt: "Fold it into a cube. Which face ends up opposite the filled one?",
  faceLabel: (pips: number) => `The face with ${pips}`,
  netLabel: (marked: number) =>
    `Six faces laid flat. The one with ${marked} is filled in.`,
} as const;

export const HIDDEN_CUBES = {
  prompt: "How many cubes, counting the ones you can't see?",
  stackLabel: "A stack of cubes, seen from one corner",
} as const;

export const MIRROR_COMPLETE = {
  prompt: "Fill the empty half so it mirrors the other one.",
  /** Shown when the reflection is right. There is no message for "not yet". */
  done: "That's it.",
  cellLabel: (row: number, column: number) => `Row ${row}, column ${column}`,
} as const;

export const SILHOUETTE = {
  prompt: "Pick a piece, turn it, then drag it into the outline.",
  /**
   * Replaces the line above once a piece is in hand. The constraint has to be
   * said out loud — a player who discovers it by trying to rotate mid-drag
   * reads it as the app being broken rather than as the rule it is.
   */
  holding: "Turn it before you drag it. It can't be turned on the way in.",
  done: "Filled. Here's another.",
  rotate: "Turn the piece",
  rotateGlyph: "⟳",
  pieceLabel: "A piece. Tap to pick it up.",
  boardLabel: "The outline. Drag a piece onto it to place it.",
} as const;

export const CALIBRATION_COPY = {
  title: "Where this actually stands.",
  trendHeading: "The trend",
  responseHeading: "What's being done",
  actionHeading: "One thing you can do",
  continue: "Next",
} as const;

export const MOOD_AFTER = {
  question: "How are you feeling now?",
  moodLowLabel: "okay",
  moodHighLabel: "awful",
  continue: "Next",
  /** Shown when the rating dropped by at least `MEANINGFUL_MOOD_DROP`. */
  improved: "Good. That was the point.",
  /** Shown when it did not. One option follows, not a menu. */
  unchanged: "That didn't shift it. One more thing, then we're done.",
} as const;

/**
 * TODO: replace with the correct current crisis/support resource for the
 * regions this ships to. Left as a placeholder deliberately — a stale or
 * wrong-country hotline number is worse than none, and this string is shown to
 * people who are still at the top of the scale.
 */
export const SUPPORT_RESOURCE = {
  line: "If it stays this bad, talking to a person helps more than an app does.",
  /** TODO: real resource name + number/URL. */
  resource: "TODO_SUPPORT_RESOURCE",
} as const;

/**
 * The whole 5-4-3-2-1, in order and all the way down to one.
 *
 * The count is the technique: it descends, so each prompt is smaller than the
 * last and the sequence lands rather than trailing off. Stopping at three —
 * which this did — leaves someone mid-count, and mid-count is the opposite of
 * the point.
 *
 * The last two are written so they cannot be failed. A room with nothing to
 * smell is a normal room, and "find two things you can smell" in one of those
 * is a person searching an empty kitchen for a way to do the exercise right.
 */
export const GROUNDING = {
  /**
   * Shown on its own before the first prompt, the same way the breath is
   * introduced before it starts. Naming the method matters here: someone who
   * has been told twice that nothing shifted is owed a reason to try a third
   * thing, and "5-4-3-2-1" is a name they may already know or can look up.
   */
  intro: "Let's try the 5-4-3-2-1 method to center yourself.",
  introHint: "Tap start to begin.",
  start: "Start",
  title: "Back in the room.",
  steps: [
    "Find five things you can see from where you are sitting.",
    "Find four things you can feel — the chair, the floor, your own hands.",
    "Find three things you can hear.",
    "Find two things you can smell. If there is nothing, two you know well will do.",
    "Find one thing you can taste. The last thing you drank counts.",
  ],
  next: "Next",
  done: "Done",
} as const;

/**
 * After the 5-4-3-2-1, and only after it.
 *
 * Two answers rather than the 0–10 scale a third time: this person has already
 * rated themselves twice and been told once that it didn't move, and a third
 * grid of numbers starts to feel like a test they keep failing. "Did it land"
 * is all this needs to know.
 */
export const CHECK_IN = {
  question: "Did that bring you back at all?",
  helped: "A little",
  didNot: "Not really",
  /** Deliberately not congratulatory. A little is the whole target. */
  helpedResponse: "That'll do. It didn't have to fix anything.",
  /**
   * The one place the app admits it may not have worked. Saying so plainly is
   * the point — the alternative is implying they did it wrong.
   */
  didNotResponse: "Then it didn't, and that's not something you got wrong.",
  done: "Done",
} as const;

export const PARK_WORRY = {
  title: "Park it.",
  body: "This isn't settled and pretending otherwise would be a lie. But it doesn't have to be now. Pick when you'll come back to it.",
  options: ["Tonight", "Tomorrow morning", "The weekend"],
  /** No notification, no reminder — the deal is with themselves, not with us. */
  confirmation: "Fine. It'll keep until then.",
  done: "Done",
} as const;

export const CLOSE = {
  title: "That's all.",
  body: "Now try to unwind without your device. Go on a walk, talk to a family member, or go master your hobby.",
  /** The only action on the screen. No rating, no share, no "come back". */
  done: "Close",
} as const;

/**
 * The last thing in the app. One line, and nothing to tap — see `closed.tsx`
 * for why it is a dead end on purpose.
 */
export const CLOSED = {
  line: "You may now close the app.",
} as const;
