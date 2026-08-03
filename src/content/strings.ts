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
  title: 'Hey, how are you today?',
  /**
   * Says it for them. The whole point is that it should be recognisable enough
   * to be pressed without being thought about — the question that actually
   * branches the session is on the next screen.
   */
  action: 'I got caught in doomscrolling',
} as const;

export const ENTRY = {
  /** No logo, no onboarding. Straight to why they opened this. */
  title: "What's stuck with you?",
} as const;

export const MOOD_BEFORE = {
  question: "How are you feeling right now?",
  moodLowLabel: "okay",
  moodHighLabel: "awful",
  continue: "Next",
  /** The one step in the session you can walk back, and only before it starts. */
  back: "change that",
} as const;

export const REACTIVATION = {
  /**
   * Deliberately not a request to describe or type anything — bringing the
   * image to mind is the whole ask, and putting words to it is a different and
   * much heavier task.
   */
  body: "Before we start — bring to mind the thing that stuck with you. You don't have to describe it.",
  skip: "Skip",
  ready: "Ready",
} as const;

export const BREATHE_INTRO = {
  /**
   * Names the exercise. "Cyclic breathing" is a real technique with real
   * evidence behind it, and saying so is worth more than a softer line would
   * be — it tells the user this is a method, not a mood.
   */
  body: "Okay, let's begin with some cyclic breathing.",
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
  /** GROUP B — this is the step that matters, and we say why. */
  witnessedFraming:
    "This next part helps stop that image from looping. It works better the longer you stay with it.",
  rotate: "Rotate",
  place: "Place",
  left: "Left",
  right: "Right",
  done: "I'm done",
  keepGoing: "Keep going",
  timeUpPrompt: "That's the time. You can stop here or stay a while longer.",
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
  title: "That's it.",
  body: "Put your phone down. Nothing here needs you again today.",
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
