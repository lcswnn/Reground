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

export const ENTRY = {
  /** No welcome, no logo, no onboarding. Straight to why they opened this. */
  title: "What's stuck with you?",
} as const;

export const MOOD_BEFORE = {
  question: 'How are you feeling right now?',
  moodLowLabel: 'okay',
  moodHighLabel: 'awful',
  continue: 'Next',
  /** The one step in the session you can walk back, and only before it starts. */
  back: 'change that',
} as const;

export const REACTIVATION = {
  /**
   * Deliberately not a request to describe or type anything — bringing the
   * image to mind is the whole ask, and putting words to it is a different and
   * much heavier task.
   */
  body: "Before we start — bring to mind the thing that stuck with you. You don't have to describe it.",
  skip: 'Skip',
  ready: 'Ready',
} as const;

export const BREATHE_INTRO = {
  /**
   * Names the exercise. "Cyclic breathing" is a real technique with real
   * evidence behind it, and saying so is worth more than a softer line would
   * be — it tells the user this is a method, not a mood.
   */
  body: "Okay, let's begin with some cyclic breathing.",
  /** Under the button, quiet. The screen waits: nothing starts on arrival. */
  hint: 'Tap start to begin.',
  start: 'Start',
} as const;

export const BREATHING_COPY = {
  inhale: 'In',
  secondInhale: 'In again',
  exhale: 'Out',
  /** Low-emphasis on purpose. It exists; it is not the thing to look at. */
  skip: 'skip',
} as const;

export const GAME_PICKER = {
  /**
   * Names the mechanism rather than hiding it. "Visuospatial" is a real word
   * doing real work here — it is *why* this step is a game and not a coping
   * tip, and someone who wants to look it up should be able to.
   */
  title: "Now, let's pick a visuospatial game to take your mind off things:",
  /** Above the paid list. Not a pitch — a label. */
  lockedHeading: 'Reground Plus',
  lockedNote: 'Not available yet.',
  /** Read out with a locked card; never shown as a badge with its own line. */
  lockedLabel: 'Locked',
} as const;

export const PUZZLE_COPY = {
  /** Fallback only — the play screen titles itself from the chosen game. */
  title: 'Fit the shapes.',
  /** GROUP A — a normal step in the sequence. */
  worldFraming: 'A few minutes of this. No score, no way to lose.',
  /** GROUP B — this is the step that matters, and we say why. */
  witnessedFraming:
    'This next part helps stop that image from looping. It works better the longer you stay with it.',
  rotate: 'Rotate',
  place: 'Place',
  left: 'Left',
  right: 'Right',
  done: "I'm done",
  keepGoing: 'Keep going',
  timeUpPrompt: "That's the time. You can stop here or stay a while longer.",
} as const;

export const CALIBRATION_COPY = {
  title: 'Where this actually stands.',
  trendHeading: 'The trend',
  responseHeading: "What's being done",
  actionHeading: 'One thing you can do',
  continue: 'Next',
} as const;

export const MOOD_AFTER = {
  question: 'How are you feeling now?',
  moodLowLabel: 'okay',
  moodHighLabel: 'awful',
  continue: 'Next',
  /** Shown when the rating dropped by at least `MEANINGFUL_MOOD_DROP`. */
  improved: 'Good. That was the point.',
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
  resource: 'TODO_SUPPORT_RESOURCE',
} as const;

export const GROUNDING = {
  title: 'Back in the room.',
  steps: [
    'Find five things you can see from where you are sitting.',
    'Find four things you can feel — the chair, the floor, your own hands.',
    'Find three things you can hear.',
  ],
  next: 'Next',
  done: 'Done',
} as const;

export const PARK_WORRY = {
  title: 'Park it.',
  body: "This isn't settled and pretending otherwise would be a lie. But it doesn't have to be now. Pick when you'll come back to it.",
  options: ['Tonight', 'Tomorrow morning', 'The weekend'],
  /** No notification, no reminder — the deal is with themselves, not with us. */
  confirmation: "Fine. It'll keep until then.",
  done: 'Done',
} as const;

export const CLOSE = {
  title: "That's it.",
  body: 'Put your phone down. Nothing here needs you again today.',
  /** The only action on the screen. No rating, no share, no "come back". */
  done: 'Close',
} as const;
