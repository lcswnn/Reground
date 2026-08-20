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
 * The door. One line, a sphere breathing above it, and a button — it fades in
 * and then waits for as long as it takes.
 *
 * ## The line is different every time, and different by the hour
 *
 * It was one fixed sentence for a long while, which is the right call for copy
 * that has to say something specific — and the wrong one for a greeting. This
 * app is opened by the same person repeatedly, in the same state, and a door
 * that says exactly the same words on the fortieth visit as on the first stops
 * being addressed to anybody. Somebody who comes here twice in an evening
 * should not feel like they have hit a wall with a sign on it.
 *
 * So: four sets of lines, one per part of the day, and one picked at random
 * from the set that fits the clock. The variation is the point *and* the risk —
 * a line that is different every time is a line nobody can rely on, so none of
 * them carry information. Every one of them says some version of "you're here,
 * let's start", and the thing that actually explains the session is on the next
 * screen, where it stays put.
 *
 * The hour buckets are not decoration either. "Long day?" is a kind sentence at
 * nine at night and a strange one at seven in the morning, and 2am is the one
 * time of day worth acknowledging on its own — somebody opening an anxiety app
 * then is having a specific kind of night, and being met with "good morning"
 * would tell them the app is not really looking.
 *
 * ## Two rules these were written under
 *
 * The rules at the top of this file apply — plain and short, and never tell the
 * user they are wrong to feel bad — plus one that belongs to this screen alone:
 * nothing here may promise what the session does. "Let's fix this" is a claim
 * the app cannot keep; "let's get you back to normal" is the user's own words
 * for why they opened it, which is a different thing and is the register all of
 * these are in.
 *
 * "User" is the name because there isn't one. Nobody signs up, nothing is
 * stored, and the app has no way to learn what to call anybody — so the lines
 * that address the reader do it with the plainest possible placeholder rather
 * than inventing a familiarity that has not been earned. The moment there is a
 * real name, this is the one place in the app that wants it.
 */
export const WELCOME = {
  /**
   * The greetings, by part of the day. `pickWelcomeLine` is what reads them.
   *
   * Every set has to be able to stand alone, because a session only ever sees
   * one of them: no line may depend on another having been read, and none may
   * assume it is the user's first visit or their fifth.
   */
  lines: {
    /** 5am to noon. */
    morning: [
      "Hey, user. Let's get you back to normal.",
      "Morning, user. Let's take the edge off.",
      "You're up. Let's start the day somewhere steadier.",
      "Hey, user. Let's sort this out before it sets the tone.",
    ],
    /** Noon to 5pm. */
    afternoon: [
      "Hey, user. Let's get you back to normal.",
      "Afternoon, user. Let's put this down for a few minutes.",
      "You're here. Let's get you back to steady.",
      "Hey, user. Let's take the charge out of it.",
    ],
    /** 5pm to 10pm. */
    evening: [
      "Hey, user. Let's get you back to normal.",
      "Evening, user. Let's calm your mind a bit.",
      "Long day? Let's take the edge off it.",
      "You're here. Let's settle down before the night ends.",
    ],
    /**
     * 10pm to 5am. Written for somebody who is awake when they would rather not
     * be — no "good night", nothing about sleep, and nothing that implies they
     * have done something wrong by being up. The offer is the same offer.
     */
    night: [
      "Hey, user. Let's get you back to normal.",
      "Late one. Let's settle this down.",
      "Still up? Let's take the edge off it.",
      "You're here at this hour? Let's get you back on track.",
    ],
  },
  /**
   * The door has a button again, and this time it is a real one.
   *
   * It used to carry a large circular button labelled "I'm feeling a bit
   * anxious right now" — a tap that cost nothing and decided nothing, which is
   * why it went. Then the screen moved on a timer instead, which cost nothing
   * and decided nothing *for* the user, which is worse.
   *
   * "Begin" is neither. It does not ask anybody to describe themselves before
   * they are through the front door, and it does not walk off while they are
   * still reading. One word, and it names the only thing this screen does.
   */
  begin: "Begin",
  /**
   * The app's name, under the button and nowhere else in the session.
   *
   * There is no logo and no title card — the door opens straight onto what the
   * app is for, which is the one thing somebody arriving wound up needs from
   * it. But a screen with no name on it anywhere is slightly anonymous, and
   * this is the one moment where saying so costs nothing: the reading is done,
   * the button has been read, and anything below it is past the point of the
   * screen.
   *
   * Kept as copy rather than read out of `app.json` so it can be set in the
   * app's own voice if the store listing ever needs a longer one.
   */
} as const;

/** Which set of greetings the clock is in. See `WELCOME.lines`. */
export type TimeOfDay = keyof typeof WELCOME.lines;

/**
 * The part of the day a given hour belongs to.
 *
 * Four buckets and no gaps, which is what the test holds it to: every hour from
 * 0 to 23 has to land somewhere, and the failure mode of getting that wrong is
 * a door with no line on it.
 *
 * The boundaries are drawn where the *sentences* change rather than where a
 * clock would put them. Morning starts at five because that is when being awake
 * stops being a late night and starts being an early start, and night begins at
 * ten for the same reason from the other side.
 */
export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";

  return "night";
}

/**
 * The door's line: one at random from the set that fits the clock.
 *
 * Takes the date rather than reading it, so the buckets can be tested at every
 * hour without moving the system clock — the same reason `moodOutcome` takes
 * two numbers instead of reading the session.
 *
 * Picked once per visit, in the screen's initial state — the same arrangement
 * `pickUnwindIdea` has at the other end of the session, and for the same
 * reason: called during render it would hand the user a different sentence on
 * every frame the sphere moves.
 */
export function pickWelcomeLine(now: Date = new Date()): string {
  const lines = WELCOME.lines[timeOfDay(now.getHours())];

  return lines[Math.floor(Math.random() * lines.length)];
}

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
 * The appearance switch, top-right on every screen.
 *
 * It is one round button with a picture in it now, and the picture is the mode
 * you are *not* in: a moon while the app is light, a sun while it is dark. That
 * is the convention every system settings panel uses and it is the one that
 * survives having no label — an icon of the state you are already in is a
 * status, and a status you can press is a trap.
 *
 * It used to be two words, "Light · Dark", with the current one in ink and the
 * other muted, and each word its own target so that tapping the mode you were
 * already in did nothing. That idempotence is the thing being given up here,
 * and it was not given up lightly: a flip control can be mis-tapped, and a
 * mis-tap on this one changes the colour of every screen under somebody's
 * thumb. What makes it acceptable is that the button is its own undo — same
 * place, same size, and the icon has already changed to say what pressing it
 * again would do.
 *
 * Nothing here is text, so nothing here needs copy except what a screen reader
 * is handed. That is `switchTo`, and it names the destination rather than the
 * state, for the same reason the icon does.
 */
export const APPEARANCE = {
  /**
   * What the button does, not what the app currently is. "Dark appearance" was
   * the old label and it was ambiguous the moment there was one control instead
   * of two — it could as easily have been reading out the setting.
   */
  switchTo: (mode: "light" | "dark") =>
    mode === "dark"
      ? "Switch to dark appearance"
      : "Switch to light appearance",
} as const;

export const DISCLOSURE = {
  /** Points along the line when closed, down into the text when open. */
  chevron: "›",
} as const;

export const ENTRY = {
  /**
   * No logo, no onboarding. Straight to why they opened this.
   *
   * "That anxiety" until the door lost its button — it was pointing at the
   * label the user had just pressed ("I'm feeling a bit anxious right now"),
   * and with nothing to press there is nothing for "that" to refer back to.
   * "Your" is the version that stands on its own.
   */
  title: "What seemed to trigger your anxiety?",
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

/**
 * The rating control itself — the row of dots both mood screens are answered
 * on. Its own block rather than living in `MOOD_BEFORE` and `MOOD_AFTER`,
 * because it is one control asked twice: the two screens own their questions
 * and their ends-of-scale labels, and the thing they are answered with says the
 * same words either time.
 *
 * Almost all of it is for a screen reader. The row is a single adjustable
 * control to VoiceOver — eleven separate buttons would be eleven stops on the
 * way past a question that takes one gesture to answer — so it needs a name and
 * a spoken value, and those cannot be read off the dots.
 */
export const MOOD_CONTROL = {
  /**
   * The whole row, named. It says both ends because a number on its own is
   * meaningless here: "8" is only bad if 10 is the bad end, and this control is
   * the one place in the session where getting that backwards would silently
   * invert the app's one measurement.
   */
  label: (min: number, max: number, low: string, high: string) =>
    `Rating, ${min} is ${low} and ${max} is ${high}`,
  /** The spoken value, once there is one. */
  value: (rating: number) => `${rating}`,
  /** And before there is. Kept out of `value` so the two cannot drift. */
  empty: "No rating yet",
  /**
   * Stands in for the number above the row until one is picked, so the readout
   * has something in it and the dots do not move when the first tap lands. An
   * em dash: the typographic mark for a value that is not there yet.
   */
  blank: "—",
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
  body: "Let's begin with some physiological sigh breathing.",
  /**
   * What the breath is, in the two lines it takes to say it.
   *
   * Naming the technique is not the same as explaining it, and this screen was
   * doing only the first. Someone about to hand half a minute to an app is owed
   * the shape of what they are copying before the circle starts moving — the
   * `leadInMs` hold exists because arriving mid-inhale means spending the first
   * cycle working it out, and reading it beforehand removes the rest of that.
   *
   * The nose and the mouth are how the sigh is actually done, and the on-screen
   * cues ("In", "In again", "Out") have never had room to say so.
   */
  method:
    "How to do the Physiological sigh:\n\n 1. Inhale deeply through your nose, and fill your lungs with air.\n 2. Inhale again sharply through your nose.\n 3. Exhale slowly and fully through your mouth.",
  /**
   * The other half of "what to expect": how long, and what to watch.
   *
   * The count comes from `BREATH_CYCLES` rather than being written out, so the
   * promise can't drift from the timings in `@/config/session`. "About half a
   * minute" is held to the same numbers by `strings.test.ts` for the same
   * reason — being told half a minute and given two is worse than being told
   * nothing. Both halves moved together when the breath came down from six
   * rounds to three: the count because it is interpolated, the length because
   * the test stopped passing.
   *
   * This used to end "…and Tully breathes with it", which stopped being true
   * the moment `SHOW_TULLY` went false in `breathing-guide.tsx`: the line
   * promised a character the next screen no longer has. Put the clause back
   * when the flag goes back up — it belongs with it, not without it.
   */
  shape: (rounds: number) =>
    `${rounds} rounds, about half a minute. The circle grows as you breathe in and shrinks as you breathe out.`,
  /** Under the button, quiet. The screen waits: nothing starts on arrival. */
  hint: "Tap start to begin.",
  start: "Start",
  /**
   * The second button on the screen, under Start — see `SIGH_EXAMPLE` for what
   * it opens.
   *
   * It was an underlined line of small text for a while, on the argument that a
   * screen with one real action should not carry two things that look like
   * buttons. What that missed is who presses it: somebody who has just read
   * three numbered steps and is not sure they can follow them, which is exactly
   * the person least likely to hunt for a link. It is a ghost button now — an
   * outline rather than a fill, so Start is still plainly the action and this is
   * plainly the other one.
   *
   * "Watch" rather than "See": it names what the next screen asks of you, which
   * is half a minute of watching rather than a page to read.
   */
  example: "Watch an example first",
} as const;

/**
 * The example run: its own screen, reached from the breath's intro and left by
 * a single button.
 *
 * It was a modal over that screen for a while, and before that a disclosure
 * inside it. Both were the same mistake in different sizes — the thing being
 * shown is a breath, a breath takes half a minute of somebody's attention, and
 * a panel is what you put a paragraph in. A screen can give the circle the room
 * to be watched, and a screen is also a thing you leave, which is what the
 * intro wants: you come back to it and press Start, having seen the thing you
 * are about to be asked to do.
 *
 * The copy here is only what the screen cannot show. The circle demonstrates
 * the shape of the breath; these say where the air goes, which is the half no
 * animation can carry — a circle growing twice and shrinking once is the rhythm
 * of a sigh, and nose-nose-mouth is what makes it one.
 */
export const SIGH_EXAMPLE = {
  /** Names what is being watched, and says it is not the real thing yet. */
  title: "An example run",
  /**
   * The three steps, numbered on screen rather than in the copy — the numbers
   * are the component's, so a step cannot be written out of order or a number
   * repeated. Each lights as the circle reaches it.
   *
   * Deliberately close to `BREATHE_INTRO.method`, which numbers the same three
   * on the screen behind. That is not duplication to be tidied away: this
   * screen replaces that one while it is up, so anything it leaves out is gone
   * rather than "still visible above".
   */
  steps: [
    "In through your nose, filling your lungs.",
    "A second, sharper breath in through your nose, on top of the first.",
    "A long, slow breath out through your mouth, all the way down.",
  ],
  /**
   * Under the steps, muted. It says the two things the loop cannot say for
   * itself: that it repeats, and that this is the same breath at the same pace
   * the real screen runs — the example is not a sped-up illustration.
   */
  caption:
    "This loops for as long as you watch it, at the pace the breath itself runs.",
  /**
   * The way out, and the only action on the screen. "Got it" rather than
   * "Back": it is the answer to what the screen just showed, and what it
   * returns to is the screen that offered it — where Start is waiting.
   */
  done: "Got it",
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
  visuospatialTitle:
    "Now, let's pick a visuospatial game to take your mind off things:",
  /**
   * The other shelf, and deliberately not a mechanism.
   *
   * The word "visuospatial" is worth its space on the other title because it is
   * a claim that holds: those games compete with an image. Nothing on this
   * shelf does anything of the kind, and dressing a ball-and-paddle up in the
   * same language would be borrowing evidence that does not cover it.
   * Something to do with your hands is the whole offer, so that is what it
   * says.
   */
  calmTitle: "Now, let's pick something to do for a few minutes:",
  /** Above the paid list. Not a pitch — a label. */
  lockedHeading: "Reground Plus",
  lockedNote: "Not available yet.",
  /** Read out with a locked card; never shown as a badge with its own line. */
  lockedLabel: "Locked",
} as const;

export const PUZZLE_COPY = {
  /** Fallback only — the play screen titles itself from the chosen game. */
  title: "Fit the shapes.",
  /**
   * The calm shelf — a normal step in the sequence, and no claim made for it.
   *
   * Keyed to the games rather than to the group, which is what it was keyed to
   * before. The two are no longer the same thing: the personal/other answer is
   * in the same group as "Something I saw" and now gets these games, and
   * telling that person their ball-and-paddle competes with a picture would be
   * a promise about a mechanism that isn't running.
   */
  calmFraming: "A few minutes of this. No score, no way to lose.",
  /**
   * The visuospatial shelf — this is the step that matters, and we say why.
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
  visuospatialFraming:
    "A few minutes of this. It competes with the picture in your head.",
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
  /**
   * The drag is worth a clause. A grid of squares reads as tappable on sight,
   * so nobody goes looking for a stroke — and drawing a nine-cell shape one tap
   * at a time is the fiddly version of a game meant to be the gentlest here.
   */
  prompt:
    "Fill the empty half so it mirrors the other one. Tap the squares, or drag across them.",
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
  /**
   * Shown once something is down and nothing is in hand, which is the only
   * moment this is worth saying — and the moment someone who has just put a
   * piece in the wrong place is looking for a way out of it.
   *
   * Says the gesture rather than pointing at the undo button, because the
   * gesture is the one that cannot be found by looking. The button is on
   * screen and will be found on its own.
   */
  lift: "Drag a piece back out of the outline to take it off.",
  done: "Filled. Here's another.",
  rotate: "Turn the piece",
  rotateGlyph: "⟳",
  undo: "Take back the last piece",
  undoGlyph: "↺",
  pieceLabel: "A piece. Tap to pick it up.",
  boardLabel:
    "The outline. Drag a piece onto it to place it, or drag one out to take it off.",
} as const;

/**
 * Join the Numbers — 2048 on the calm shelf.
 *
 * The prompt is two short sentences and no more, because most people arriving
 * at this board have played it before and the ones who haven't will find the
 * rule out on their first swipe. It does not mention 2048, a target, or how
 * high the numbers go: naming a tile to reach is the score this shelf does not
 * keep, wearing a different hat.
 *
 * `stuck` is the one line that had to be argued over. It is what shows when the
 * board fills with nothing to join — the moment ordinary 2048 says "game over"
 * — and it says what is about to happen rather than what has gone wrong. No
 * apology, no "unfortunately", and nothing that could be read as a verdict on
 * how the last few minutes went.
 */
export const MERGE_TILES = {
  prompt: "Swipe to slide everything one way. Two of the same become one.",
  stuck: "Out of room. The smallest tiles go, and you carry on.",
  boardLabel: "A grid of numbered tiles. Swipe in any direction to slide them.",
  /**
   * Offered to a screen reader in place of the swipe. The names are the four
   * `Direction` values, which is what makes them safe to hand straight to the
   * move — see `onAccessibilityAction` in `merge-tiles.tsx`.
   */
  actions: [
    { name: "up", label: "Slide up" },
    { name: "down", label: "Slide down" },
    { name: "left", label: "Slide left" },
    { name: "right", label: "Slide right" },
  ],
} as const;

/**
 * Line Up Three — the casual match puzzle on the calm shelf.
 *
 * The prompt is one sentence because most people arriving at this board have
 * played some version of it before, and the ones who have not will have the
 * rule after one swap. It does not mention points, a target, a level or a
 * combo: this shelf keeps no score, and a prompt that promised one would be the
 * score wearing a different hat.
 *
 * `stuck` is the line that took the arguing, and it is the same argument
 * `MERGE_TILES.stuck` had. It shows at the moment every other game of this kind
 * says "no more moves", and it says what is about to happen rather than what
 * has gone wrong — no apology, and nothing that reads as a verdict on how the
 * last few minutes went.
 *
 * The kind names are what a screen reader says instead of seeing the shape, so
 * they are the shapes' plain names and not decorative ones. `cellLabel` puts the
 * shape first, before the coordinates, because that is the part being compared
 * with its neighbours.
 */
/**
 * The optional score, and the word that turns it on.
 *
 * Every phrase here is a count of something *done* rather than a total to beat:
 * bounces, balls, flowers, cleared pieces. That is the difference between a
 * score this app can carry and one it cannot — see `score-preference.tsx`, and
 * the notes at the top of each game, all of which explain why none of them
 * shipped with a number in the first place.
 *
 * Two rules the wording is held to. Nothing says "best", "high" or "record",
 * because none of those exist and inventing one would give a person something
 * to lose. And every line reads the same at zero as it does at forty: "0
 * bounces" is a fact about a round that has just started, where "you missed"
 * would be a verdict on it.
 */
/**
 * Keep it in the air, in words.
 *
 * The two lines were written into the component when it was the only game with
 * nothing to say — they are here now because the score row reads the hint, and
 * a hint that lives in a JSX literal cannot be read by anything.
 */
export const BOUNCE_GAME = {
  prompt: "Keep it in the air.",
  start: "Start",
  boardLabel:
    "Bouncing ball game. Drag to move the paddle and keep the ball in the air.",
} as const;

export const SCORE = {
  /** The control, in both directions. A word to press, not a switch to read. */
  show: "Show score",
  hide: "Hide score",
  /** Keep it in the air: how many times the ball has come off the paddle. */
  bounces: (count: number) => `${count} ${count === 1 ? "bounce" : "bounces"}`,
  /**
   * Knock the pegs out: both halves, because either alone is misleading — pegs
   * without balls is a number with no cost attached, and balls without pegs is
   * a count of attempts.
   */
  pegs: (balls: number, knocked: number) =>
    `${balls} ${balls === 1 ? "ball" : "balls"} · ${knocked} ${knocked === 1 ? "peg" : "pegs"}`,
  /** Open the flowers: how many have opened, across however many fields. */
  flowers: (count: number) =>
    `${count} ${count === 1 ? "flower" : "flowers"} opened`,
  /**
   * Join the numbers: the largest tile on the board, which is the only number
   * this game was ever really about.
   */
  highest: (value: number) => `Highest tile: ${value}`,
  /**
   * Line up three: pieces cleared. Not lines — a chain that clears seven in one
   * move should read as a bigger thing than one that clears three, and lines
   * would flatten that to "two".
   */
  cleared: (count: number) => `${count} cleared`,
} as const;

export const MATCH_THREE = {
  /**
   * Two ways to play it, and the drag goes first because it is the one most
   * people will reach for without being told. The tap stays in the sentence
   * anyway: it is the only one of the two that works with a screen reader, and
   * it is what somebody falls back to when a drag has just been read as a tap.
   */
  prompt: "Drag a shape onto its neighbour, or tap the two. Three in a line clears.",
  stuck: "Nothing left to line up. The board deals itself out again.",
  /**
   * The spoken version, and it deliberately says only the tap. Dragging is a
   * gesture VoiceOver has already taken for its own navigation, so a label
   * offering it would be describing something that cannot be done.
   */
  boardLabel: "A grid of shapes. Tap two neighbouring shapes to swap them.",
  cellHint: "Swaps with the shape you tap next.",
  empty: "Empty",
  kinds: {
    dot: "Circle",
    ring: "Ring",
    square: "Square",
    diamond: "Diamond",
    bar: "Bar",
  },
  cellLabel: (shape: string, row: number, column: number) =>
    `${shape}, row ${row}, column ${column}`,
} as const;

/**
 * Knock the Pegs Out — the ball-and-targets game on the calm shelf.
 *
 * The prompt is the two halves of the only gesture there is, in the order they
 * happen. It says nothing about what the pegs are for, because they are not for
 * anything: they go when they are hit, and there is no total they add up to.
 *
 * There is no line for a ball that hits nothing and no line for a field being
 * cleared. The first would be the app commiserating about a thing that costs one
 * tap, and the second would turn a field into something that can be left
 * unfinished.
 */
export const PEG_DROP = {
  prompt: "Drag to aim, then let go. The ball takes out whatever it touches.",
  boardLabel:
    "A field of pegs. Drag to aim the ball at the top of the board, then let go to drop it.",
  /**
   * Offered to a screen reader in place of the aim-and-release. Straight down is
   * a perfectly good shot, so the action is the whole game minus the aiming —
   * see `onAccessibilityAction` in `peg-drop.tsx`.
   */
  actions: [{ name: "drop", label: "Drop the ball" }],
} as const;

/**
 * Open the Flowers — the atmospheric one on the calm shelf.
 *
 * Every line here is written to promise less than it could. There is no
 * objective in this game, so the prompt describes what happens rather than what
 * to do, and stops before saying why. Nothing tells anyone how many flowers are
 * left, or that a finished field is an achievement, because the moment a field
 * has a completion in it the person playing has something they can be behind on.
 *
 * There is no line for the field being finished at all. It fades and another
 * one arrives, and that is legible without being narrated — a caption there
 * would be the app taking a bow for something the player did not set out to do.
 */
export const BLOOM_FIELD = {
  prompt: "Drag anywhere. Whatever the petal passes opens.",
  boardLabel: "A field of closed flowers. Drag across them and they open.",
  /**
   * Offered to a screen reader in place of the drag. `open` is the name the
   * board matches on — see `onAccessibilityAction` in `bloom-field.tsx`.
   */
  actions: [{ name: "open", label: "Open a flower" }],
} as const;

/**
 * The three headings are the screen's contract and the reason it works: what's
 * going on, what's being done, what you can do. Every entry in
 * `@/content/calibration` fills all three, in that order — see the note there
 * on why ending on the action rather than the trend is the whole point.
 */
export const CALIBRATION_COPY = {
  title: "Where this actually stands.",
  trendHeading: "The trend",
  responseHeading: "What's being done",
  actionHeading: "One thing you can do",
  continue: "Next",

  /**
   * Shown while the artifact is still in flight. Almost nobody sees it — the
   * fetch is warmed at the topic picker, five minutes upstream — so it is
   * written for the one person on a bad connection rather than as a normal
   * state of the screen.
   */
  dataLoading: "Getting the numbers…",
  /**
   * Shown when the fetch failed. It has to do two things at once: not pretend
   * the charts are coming, and not leave the reader wondering whether the
   * paragraph above them was also missing something. It wasn't — the copy is
   * the screen, the charts are the receipts.
   */
  dataUnavailable:
    "The charts need a connection and there isn't one right now. Nothing above depends on them.",
  /**
   * Shown for a topic with no series behind it at all — currently politics
   * alone. Distinct from the line above on purpose: that one is a phone
   * problem and will fix itself, this one is us saying we don't have it.
   */
  dataNone: "No charts for this one — see above for why.",

  /** Under a chart whose headline is a nowcast rather than a reading. */
  projected: (year: string) => `projected for today, last measured ${year}`,
  /** Under a chart whose headline is the measurement itself. */
  measured: (year: string) => `measured ${year}`,
} as const;

export const MOOD_AFTER = {
  question: "How are you feeling now?",
  moodLowLabel: "okay",
  moodHighLabel: "awful",
  continue: "Next",
  /*
   * The two replies that used to sit under the scale — "Good. That was the
   * point." for a real drop, and a plainer line for none — are gone with the
   * slot that held them. See the note at the top of `mood-after.tsx`: the
   * screen asks the same question as `mood.tsx` and now looks like it. The
   * rule they were chosen by is still `moodOutcome`, still tested, and read by
   * nothing on screen.
   */
} as const;

/**
 * The last question: one more thing, or nothing.
 *
 * The question mark is doing real work — this is an offer and it has to be
 * refusable, which is what `skip` is for. A menu with no way past it is not a
 * question, and someone who feels fine now is exactly the person this screen
 * should be quickest to let go.
 *
 * `lead` says the session ends after this, because it does: there is no loop
 * back to the start and the user should know they are picking a last thing
 * rather than opening a drawer.
 *
 * The five options name themselves — see `@/content/one-more`, which holds
 * their titles the same way the game catalog holds its own.
 */
export const ONE_MORE = {
  title: "One more thing before we finish.",
  lead: "Pick one extra exercise if you need it.",
  /** Quiet, under the list. Not a button — an exit. */
  skip: "Let's finish up. I'm done.",
} as const;

/**
 * The one option that can still have nothing behind it: soundscapes, in a build
 * with no audio files in it. Every other exercise on the list is now written.
 *
 * It is still on the list and still tappable, and this is the screen that makes
 * that honest. It says the app hasn't built it — not that the user picked
 * wrong, and not that something went wrong — and it puts the way back to the
 * list next to the way out, because a dead end at the end of a session about
 * anxiety is a poor last impression.
 *
 * Not deletable, unlike when this note said "delete an entry as each exercise
 * lands". The remaining case is not a missing exercise, it is a missing asset,
 * and `hasSoundscapes` can be false in a real build at any point in the future.
 */
export const NOT_YET = {
  eyebrow: "Not built yet",
  body: "This one isn't in the app yet — it's on the list. Pick something else, or call it here.",
  back: "Pick something else",
  done: "Finish up",
} as const;

/**
 * Crisis routing: the numbers, and the words around them.
 *
 * This is the one part of the app that is not about anxiety management at all.
 * Everything else here is built on the claim that a bad half-hour can be
 * interrupted; this is the admission that some of them cannot be, and that when
 * that is the case the right thing for an app to do is hand the person to
 * somebody real as fast as possible.
 *
 * ## Rules these were written under
 *
 * 1. **Every option is a number you could dial from a landline.** No accounts,
 *    no apps, no "learn more" pages. The row's own label carries the number, so
 *    a device that cannot open `tel:` — an iPad, a locked-down phone — still
 *    leaves the reader looking at something they can use.
 * 2. **Nothing here asks the user to characterise themselves.** No "if you are
 *    in crisis", no "if you are having thoughts of". Somebody deciding whether
 *    they are bad enough to call is somebody the app has just given a test to
 *    fail. The lines say what each number is and leave the decision alone.
 * 3. **It says what it does not know.** All four numbers are US ones and the
 *    app has no idea where anybody is — that is the last line, and it is a link
 *    to the directory rather than a shrug.
 *
 * ## `regions`, and what has to change when this ships elsewhere
 *
 * These are hard-coded for the US because that is where this ships. That is a
 * decision with an expiry date on it: the moment the app is available anywhere
 * else, showing 988 to somebody in Manchester is worse than showing nothing,
 * because it is a wrong answer delivered with confidence. `note` is doing the
 * work of covering that gap today and it is not a substitute for localising.
 */
export const CRISIS = {
  /**
   * The line that opens the sheet, and it took several tries. "Get help" is
   * what a support page says; "Emergency" is a word that raises the heart rate
   * of the person reading it. This names the thing on offer — a person, now —
   * and it is the same phrase whether the sheet is opened from a rating of 3 or
   * a rating of 10.
   */
  trigger: "Need help immediately? Talk to someone now.",
  title: "Talk to someone now",
  /**
   * Two sentences, and the second one is the important one: it is there to stop
   * the reader deciding they are not bad enough. Lifelines take distress calls,
   * not only emergencies, and people who need them routinely believe otherwise.
   */
  lead: "These are free, open all night, and answered by people. You do not have to be in danger to use one.",
  /**
   * Under the numbers, and the whole of the sheet for anybody who answered
   * "somewhere else" — see `CRISIS_REGIONS`. A directory maintained by people
   * whose job that is beats a number this app half-remembers.
   */
  directory: "findahelpline.com lists a line for almost every country.",
  /** Shown with the above when the app has no numbers for the chosen country. */
  directoryOnly:
    "This app does not carry numbers for the country you picked, and a wrong number is worse than none. This directory does carry them.",
  /**
   * The way back to the question the door asked once. Tapping it reopens the
   * picker, which is the only route to changing an answer.
   *
   * It named the country for a while — "Numbers for Australia" — on the
   * argument that the sheet should say whose numbers these are. Two things were
   * wrong with that. It read as a heading rather than as a control, so the one
   * thing on the sheet that could be changed looked like the one thing that
   * could not; and it is a sentence about the app's state offered to somebody
   * who is on this sheet because they need a phone number, not a status report.
   * This says what pressing it does and nothing else.
   */
  region: "Change location selection",
  /** The way out. Plain, and not "I'm fine" — nobody should have to claim that
      to close a panel. */
  close: "Close",
  /**
   * The glyph on the chrome-row button, and what a screen reader is told it is.
   *
   * A lowercase `i` in the app's own face rather than an icon: there is no icon
   * set here, and the letter is the most widely understood mark for "there is
   * information behind this" that exists. The spoken label does not say "info",
   * because a button announced as information is a button nobody in trouble
   * bothers with — it names what is actually inside.
   */
  glyph: "i",
  buttonLabel: "Support and crisis numbers",
} as const;

/**
 * The question asked once, on the first launch, and the sentence that says why
 * it is being asked.
 *
 * ## Why ask at all
 *
 * Because the alternative is worse in both directions. Showing US numbers to
 * everybody is a wrong answer delivered with confidence to most of the world;
 * showing none is an app with no off-ramp. The country is the one fact that
 * turns the crisis sheet from a gesture into a phone call, and it is a fact the
 * user can give in one tap.
 *
 * ## Why it says why
 *
 * `lead` is the whole of the app's argument for asking. An app that stores
 * nothing else about you and then wants to know where you are owes an
 * explanation *before* the question rather than in a policy behind it — and the
 * honest explanation happens to be reassuring: it is a country, not a location,
 * it never leaves the phone, and the only thing it changes is which numbers are
 * printed if you ever open that sheet.
 *
 * It is also the one screen in the app that mentions crisis before the user
 * has, which is why it is written as housekeeping rather than as concern. "In
 * case you ever need it" is doing a lot of work in that sentence: it makes the
 * question about the app being prepared rather than about the person being
 * fragile.
 */
/**
 * What this app is, and what it is not. The scope statement.
 *
 * ## Why it exists
 *
 * Everything else in this file is careful about the limits of one *exercise* —
 * see `SOMATIC_COPY.principlesLimit`, and the two `cautionsLimit` lines, which
 * say what a two-minute version of a twenty-minute technique can and cannot do.
 * None of them says what the app is. That gap is the thing safety reviewers
 * actually look for in this category, alongside crisis routing: bounded
 * sessions, clear scope, a plain statement of what the software is not, and a
 * way to reach a person. The first was already true of the design — one
 * session, no account, nothing saved — and this is the sentence that says so
 * out loud.
 *
 * It is also the honest thing to do independently of anybody reviewing it. This
 * app is opened by somebody who has already decided they are not okay, and it
 * has no way of knowing how not-okay. Saying what it is not, before it is
 * needed, is the least an app in that position can do.
 *
 * ## Two versions of one sentence
 *
 * `full` ends by pointing at the numbers, and is only ever shown where numbers
 * are actually on screen — the crisis sheet, directly above them. `short` is
 * the same statement with that clause removed, for the door, where there is
 * nothing above it to point at and the crisis numbers are a tap away in the
 * corner instead.
 *
 * They are two strings rather than one built from parts because they are read
 * in two different situations and the difference between them is a full stop in
 * a different place, not a variable.
 */
export const SCOPE = {
  full: "Reground is an app that provides daily breathing guides, mood tracking, and mindfulness exercises designed to help you manage everyday stress. The app does not cure mental health conditions or replace a doctor. If you need additional assistance, call or text the numbers below for support.",
  short:
    "Reground is an app that provides daily breathing guides, mood tracking, and mindfulness exercises designed to help you manage everyday stress. The app does not cure mental health conditions or replace a doctor.",
} as const;

export const REGION_PICKER = {
  title: "Where are you?",
  lead: "So the app knows which crisis numbers to show you, in case you ever need them. It is a country, not a location — it stays on this phone, and it changes nothing else.",
  /** Sits under the list. The escape hatch, and a real answer rather than a skip. */
  elsewhereNote:
    "Pick anything now and it can be changed later, from the same sheet the numbers are on.",
} as const;

/**
 * TODO: replace with the correct current crisis/support resource for the
 * regions this ships to. Left as a placeholder deliberately — a stale or
 * wrong-country hotline number is worse than none, and this string is shown to
 * people who are still at the top of the scale.
 */
export const SUPPORT_RESOURCE = {
  line: "If it stays this bad, talking to a person helps more than an app does.",
  /**
   * A real place to turn, not a placeholder — this shipped as
   * `TODO_SUPPORT_RESOURCE` for a while, which on the two screens that show it
   * was the app pointing a person in real distress at a string literal, and is
   * also the kind of unfinished content App Review rejects outright.
   *
   * The 988 Suicide & Crisis Lifeline: US-only, which matters — call/text 988
   * works from any US phone, and it takes anxiety and emotional-distress calls,
   * not only crisis-of-the-worst-kind ones, which is exactly the register the
   * line above strikes. If the app ever localises, this is the string that has
   * to localise first.
   */
  resource:
    "In the US, you can call or text 988 — the Suicide & Crisis Lifeline — any time.",
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
   * introduced before it starts. It is a beat between picking the thing and
   * being given the first instruction — the sequence used to open cold on
   * "find five things you can see", which is an instruction arriving with no
   * idea what it is the first of.
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

/**
 * The somatic movements — the screen chrome, the rules that apply to all six,
 * and the three beats a movement runs through.
 *
 * The movements themselves name and explain themselves in `@/content/somatic`,
 * the same way the game catalog and the one-more list hold their own titles.
 * What is here is everything that is true of the step rather than of a movement.
 *
 * ## Why `principles` exists at all
 *
 * Every source on somatic work says some version of the same four things, and
 * they are not decoration around the exercises — they are the difference
 * between the exercises working and the exercises being a set of stretches
 * somebody is trying to win at. Two of them cut directly against what an
 * anxious person will do on their own: they will go harder to get it over with,
 * and they will keep going through something that has started to feel worse
 * because stopping looks like failing. So the rules are said once, up front,
 * where they cover all six.
 *
 * Behind a tap, not on the screen, and that is the `Disclosure` argument again:
 * someone who wants to get on with it should see six options and not a preamble,
 * and someone who wants to know how to do this properly should not have to guess.
 * The one exception is `stop`, which is repeated in the open on the timer screen
 * — see `stopHint`. A rule about when to stop is worth nothing if it is folded
 * away at the moment it applies.
 */
export const SOMATIC_COPY = {
  title: "Somatic movements.",
  /**
   * Says what the family of exercises is for in one line, because "somatic" is
   * the one word on the one-more list that names a method most people have not
   * heard of. Unlike "visuospatial" on the game picker — which is worth its
   * space because it is a claim about a mechanism — this is worth its space
   * because without it the card is a label with nothing behind it.
   */
  lead: "Small movements that go at the anxiety through your body instead of through your head. Pick one.",

  /** The tap that opens `principles`. Phrased as what the reader gets. */
  principlesLabel: "How to do these so they work",
  /**
   * The four rules, in the order they bite. Slow first because it is the one
   * that is disobeyed immediately; the stopping rule last because it is the one
   * that matters most and last is where it will be read.
   */
  principles: [
    "Slow is the instruction, not a gentler version of it. None of these work better done harder or faster.",
    "You are not trying to make the feeling go away. You are paying attention to what your body is doing while it is here. Anything that loosens, loosens on its own.",
    "Odd things are normal — yawning, sighing, a shiver, your eyes watering, your stomach making noise. That is the nervous system offloading, not something going wrong.",
    "If something starts to feel worse instead of steadier, stop it. That is information, not failure. Put both feet on the floor and look around the room instead.",
  ],
  /**
   * Under the four. The honest limit of what this screen is, and it is here
   * rather than in `SUPPORT_RESOURCE` because it is not about crisis — it is
   * about the specific thing somatic work is used for by people who know what
   * they are doing, which is not a thing six timed exercises in an app can do.
   */
  principlesLimit:
    "These are the ones that are safe to do on your own from a screen. The deeper somatic work is real, and it wants a person in the room who knows how — it is not what this is.",

  /** Above the steps on the tutorial screen. */
  howHeading: "How",
  /** Above the `notice` line. Not "tip" — it is the exercise, not a bonus. */
  noticeHeading: "What to notice",
  /** Under the Begin button, quiet. Nothing starts on arrival. */
  introHint: "Nothing starts until you tap begin.",
  begin: "Begin",
  /** Ghost, on both the tutorial and the settle screen. */
  another: "Pick a different one",

  /**
   * Shown in place of the clock during `SOMATIC.setMs`, while the user gets
   * into position. Says which way it is going, so the wait reads as part of the
   * exercise rather than as the app hesitating.
   *
   * The 3-2-1 that follows it is digits and needs no copy — see `countLabel`
   * for the only part of it that is words.
   */
  leadIn: "Get yourself set.",
  /**
   * Read out in place of a bare numeral, which a screen reader would otherwise
   * announce as a quantity of nothing in particular. Says what the number is
   * counting towards, because on this screen that is the whole of its meaning.
   */
  countLabel: (n: number) => `Starting in ${n}`,
  /**
   * The way out of a running timer, and the only button on that screen. Worded
   * as a decision the user made rather than as an escape — someone stopping
   * because it started to feel wrong is doing the right thing, and a button
   * marked "skip" would tell them they had bailed on it.
   */
  stop: "That's enough",
  /**
   * Under it. The fourth principle, in the open, at the one moment it applies —
   * see the note above on why this one is not left behind the tap.
   */
  stopHint: "Stop early if it stops feeling okay.",

  /**
   * The settle screen. Every run lands here, whether the clock ran out or the
   * user stopped it, because "end on something settled" is itself one of the
   * instructions — the sources are unanimous that a somatic exercise should
   * finish on the calm rather than on whatever it stirred up.
   *
   * The body is written so that "nothing" is a real answer and not a wrong one.
   * A closing question that only accepts an improvement is a question that
   * teaches people to lie to it, and this app has already told the user once
   * that something not working is not something they got wrong.
   */
  settleTitle: "Stop there.",
  settleBody:
    "Sit still for a few seconds and notice what is different — your breathing, your shoulders, your hands. If nothing is different, that is a real answer too.",
  settleDone: "That's it",
  settleLonger: "A bit longer",
} as const;

/**
 * The paced breathing patterns — the screen chrome, the rules that apply to all
 * four, and the beats a pattern runs through.
 *
 * The patterns themselves name and explain themselves in `@/content/breathwork`,
 * the same way the somatic movements and the game catalog hold their own. What
 * is here is everything that is true of the step rather than of a pattern.
 *
 * ## Why the cautions exist, and why one of them is not behind the tap
 *
 * Breathing is the one exercise in this app where doing it enthusiastically
 * makes it work less well, and the trials say so directly: the 2025 comparison
 * found that people paced at six breaths a minute drifted into breathing too
 * big and ended up mildly over-breathing. An anxious person told to breathe
 * will take a huge breath. So "slow, not big" is the first rule, in the open on
 * every intro screen rather than only behind the disclosure.
 *
 * The rest sit behind the tap on the same argument `SOMATIC_COPY.principles`
 * makes: someone who wants to get on with it should see four options, not a
 * preamble. The exception is the stopping rule, which is repeated on the
 * running screen — see `stopHint`. A rule about when to stop is worth nothing
 * folded away at the moment it applies.
 */
export const BREATHWORK_COPY = {
  title: "Breathing, another way.",
  /**
   * Says what separates these from the sigh at the start, because that is the
   * question anyone arriving here is actually asking — they have already done a
   * minute of breathing in this session and are being offered another one.
   */
  lead: "Slower patterns, held for a minute or two. Different from the sigh at the start: here the pace is the thing. Pick one.",

  /** The tap that opens `cautions`. Phrased as what the reader gets. */
  cautionsLabel: "How to do these so they work",
  /**
   * In the order they bite. Over-breathing first because it is the one that is
   * disobeyed immediately and the one with a trial behind it; the stopping rule
   * last because it matters most and last is where it will be read.
   */
  cautions: [
    "Slow, not big. The rate is what does the work — a lungful on every breath will leave you dizzy and no calmer.",
    "The counts are a pace, not a target. If you run out of air before the circle turns, take less in rather than trying harder.",
    "The holds are the optional part. Drop them and just breathe the in-and-out if they are unpleasant — the patterns without holds did better in the trials anyway.",
    "Lightheaded, tingling, or a heart that speeds up instead of settling means stop. Breathe normally and let it pass. That is the pattern not suiting you today, not something you got wrong.",
  ],
  /**
   * Under the four. The honest size of the effect, and the one population this
   * screen should not assume it is helping. Same job `SOMATIC_COPY.principlesLimit`
   * does, and written under `CALIBRATION_COPY`'s rule — a claim only works here
   * if the user could go and check it and find it holds.
   */
  cautionsLimit:
    "The effect here is real and it is modest: a few points on a scale, measured right after doing it. If you get panic attacks, deliberate breathing sometimes sets one off rather than heading it off — if that is you, the movements or the 5-4-3-2-1 are the safer picks.",

  /** Above the steps on the intro screen. */
  howHeading: "How",
  /** Above `notice`. Not "tip" — it is the exercise, not a bonus. */
  noticeHeading: "What to notice",
  /**
   * Above `evidence`. Phrased as a limit rather than a boast, because half of
   * what these lines say is where the technique is weaker than its reputation.
   */
  evidenceHeading: "What's actually known",
  /** Under the Begin button, quiet. Nothing starts on arrival. */
  introHint: "Nothing starts until you tap begin.",
  begin: "Begin",
  /** Ghost, on both the intro and the settle screen. */
  another: "Pick a different one",

  /**
   * The four cues, shown one at a time in the middle of the circle's swing.
   *
   * Both holds get the same word. They are different instructions in the sense
   * that one is on a full chest and one on an empty one, but the circle has
   * already said which — it is sitting at the top or at the bottom — and a cue
   * reading "Hold, empty" is a sentence to parse at the one moment there is
   * least room for one.
   */
  in: "In",
  hold: "Hold",
  out: "Out",

  /**
   * The way out of a running pattern, and the only button on that screen. Same
   * words the somatic timer and the soundscape player use, deliberately: the
   * three are the same promise, and stopping is not quitting.
   */
  stop: "That's enough",
  /** Under it. The fourth caution, in the open, at the one moment it applies. */
  stopHint:
    "Stop if it stops feeling okay. Breathing normally is always the right answer.",

  /**
   * The settle screen. Every run lands here, whether it finished or was stopped.
   *
   * The instruction is to give the breath back rather than to keep holding the
   * pattern, which is the specific thing people get wrong about these: a paced
   * breath is a thing you do for a minute, not a way you are now supposed to
   * breathe. Written so that "nothing changed" is a real answer, for the reason
   * `SOMATIC_COPY.settleBody` is — `CHECK_IN.didNotResponse` already told this
   * user out loud that a thing not working is not something they got wrong, and
   * this screen does not get to imply otherwise two taps later.
   */
  settleTitle: "Let it go back to normal.",
  settleBody:
    "Stop counting and let your breathing do whatever it wants for a few seconds. See where it settles on its own. If it settles exactly where it started, that is a real answer too.",
  settleDone: "That's it",
  settleAgain: "Another round of that",
} as const;

/**
 * The soundscapes — the picker, and the screen the sound plays on.
 *
 * The shortest of the three built exercises, because it is the only one with
 * nothing to explain. The breath has a technique behind it, the somatic
 * movements have a body to instruct; this is a list of sounds and a way to stop
 * one. Copy that told the user how to listen would be copy for its own sake.
 *
 * The one thing worth saying up front is that it ends on its own — see `lead`.
 */
export const SOUNDSCAPE_COPY = {
  title: "Soundscapes.",
  /**
   * Says the shape of the thing rather than the benefit. That it plays once and
   * finishes by itself is the fact the user needs, because it is what makes
   * this the one exercise here they do not have to do anything to complete —
   * and because the alternative reading, that they have picked something which
   * will run until they stop it, is exactly the wrong thing to hand somebody at
   * the end of a session about anxiety.
   */
  lead: "Something to listen to. It plays once and finishes on its own.",
  /**
   * Under the list, quiet. Not an instruction — most people will be holding a
   * phone, and a soundscape through a phone speaker is still a soundscape.
   */
  hint: "Headphones if you have them.",

  /**
   * On the playing screen, under the name. There is nothing to do and that is
   * worth saying once, because a screen with a single button on it otherwise
   * looks like a screen waiting for you to press it.
   */
  playing: "Nothing to do. Put the phone down if you like.",
  /**
   * The way out, and the only button. Same word the somatic timer uses and
   * deliberately so: the two are the same promise — this ends when you say, and
   * choosing to end it is not quitting.
   */
  stop: "That's enough",

  /**
   * Shown while the file is still opening. Almost nobody sees it — the audio is
   * bundled rather than fetched, so there is no network in the way — so it is
   * written for the one person on an old phone rather than as a normal state of
   * the screen.
   */
  loading: "Starting…",
  /**
   * Shown when the audio could not be opened at all. It has to say what
   * happened without asking the user to do anything about it: they are three
   * taps from the end of a session and are not going to debug a codec.
   */
  failed: "This one won't play. Pick another, or call it here.",
  back: "Pick a different one",
  done: "Finish up",
} as const;

/**
 * Progressive muscle relaxation — the screen chrome, the rules that apply to
 * all four routines, and the beats a routine runs through.
 *
 * The routines name and explain themselves in `@/content/pmr`. What is here is
 * everything true of the step rather than of a routine.
 *
 * ## The lead says the list is a ladder
 *
 * It has to. The other two pickers in this step offer options that differ by
 * what the room allows or by what a body will put up with, and either way the
 * user picks one and is done. These four are the same technique at four
 * lengths, in the order they are learned, and somebody who taps the shortest
 * one because it is the shortest has taken the last rung of a ladder without
 * the ladder. Saying so costs a line and is the difference between a menu and
 * an explanation.
 *
 * ## Why the fourth caution is the one that had to be written carefully
 *
 * Deliberate relaxation makes a minority of people *more* anxious, not less. It
 * is well enough documented to have a name — relaxation-induced anxiety — and
 * in the study that named it, it happened to roughly a third of chronically
 * tense people doing progressive relaxation. That number is high enough that
 * somebody using this app will hit it, and the worst outcome is that they read
 * it as evidence they are beyond help. So the caution says it is common, says
 * it has a name, and says what to do. It is repeated on the running screen —
 * see `stopHint` — because a rule about stopping is worth nothing folded away
 * behind a tap at the moment it applies.
 */
export const PMR_COPY = {
  title: "Progressive muscle relaxation.",
  /**
   * Two jobs in two sentences: what the technique is for someone who has never
   * met it, and why there are four of them. The second half is the one that
   * cannot be cut — see the note above.
   */
  lead: "Tighten a part of you, then let it go, and notice the difference. The four below are the same technique at four lengths, in the order it is normally learned — the long ones teach you what letting go feels like, the short ones are what you use once you know.",

  /** The tap that opens `cautions`. Phrased as what the reader gets. */
  cautionsLabel: "How to do these so they work",
  /**
   * In the order they bite. The tension level first because it is disobeyed
   * immediately and is what turns this into cramp; the stopping rule last
   * because it matters most and last is where it will be read.
   */
  cautions: [
    "Three-quarters, never as hard as you can. Firm enough to feel where the muscle is, and nowhere near hard enough to hurt.",
    "Skip anything injured, sore, or recently operated on. The routine works fine without it — a part you leave out is not a part you failed.",
    "Keep breathing while you tense. Holding your breath through a squeeze is what makes people lightheaded, and it is not part of this.",
    "If letting go makes you more anxious rather than less, stop. That happens to a lot of people — about a third, in one study of chronically tense adults — it has a name, and it is not something you got wrong.",
  ],
  /**
   * Under the four. The dose gap, stated plainly: the trials that produced the
   * numbers in each routine's `evidence` ran twenty minutes with a person in
   * the room, and this is two from a phone. Same job `SOMATIC_COPY.principlesLimit`
   * does, under `CALIBRATION_COPY`'s rule about checkable claims.
   */
  cautionsLimit:
    "The research behind this mostly used twenty to twenty-five minute sessions with someone teaching it, often weekly for a couple of months. These are two-minute versions of that, done alone. Same technique, a fraction of the dose, and worth knowing if it does less than you were hoping.",

  /** Above the steps on the intro screen. */
  howHeading: "How",
  /** Above `notice`. Not "tip" — it is the exercise, not a bonus. */
  noticeHeading: "What to notice",
  /** Above `evidence`. Phrased as a limit rather than a boast. */
  evidenceHeading: "What's actually known",
  /** Above the list of body parts on the intro screen. */
  orderHeading: "In this order",
  /** Under the Begin button, quiet. Nothing starts on arrival. */
  introHint: "Nothing starts until you tap begin.",
  begin: "Begin",
  /** Ghost, on both the intro and the settle screen. */
  another: "Pick a different one",

  /**
   * Shown in place of an instruction during `PMR.leadInMs`, while the user gets
   * settled. Longer than the somatic equivalent because it is asking for more:
   * the somatic hold is time to stand up, this is time to sit back and stop.
   */
  leadIn: "Sit back. Let your eyes close if you like.",

  /**
   * The two cues, and they are verbs rather than labels. "Tension" and
   * "Release" are what the manuals call the phases; "Tense" and "Let go" are
   * what you say to somebody who is doing it with their eyes shut.
   */
  tense: "Tense",
  release: "Let go",

  /**
   * The way out of a running routine. Same words the somatic timer, the
   * soundscape player and the breath pacer use — the four are the same promise.
   */
  stop: "That's enough",
  /** Under it. The fourth caution, in the open, where it applies. */
  stopHint: "Stop if it stops feeling okay. Nothing here has to be finished.",

  /**
   * The settle screen. Every run lands here, finished or stopped.
   *
   * The body asks for the one thing the technique is actually for, which is not
   * the relaxation — it is noticing the difference. Somebody who can tell a
   * loose shoulder from a tight one has got the transferable part, and they can
   * have got it from a run that did not feel especially calm. Written so that
   * "no different" is a real answer, for the reason `SOMATIC_COPY.settleBody`
   * is: `CHECK_IN.didNotResponse` already told this user out loud that a thing
   * not working is not something they got wrong.
   */
  settleTitle: "Stay there a moment.",
  settleBody:
    "Don't move yet. See which parts of you are heavier than they were, and which ones went straight back to holding on. Knowing which one is yours is most of what this is for — and if nothing feels different, that is a real answer too.",
  settleDone: "That's it",
  settleAgain: "Run it again",
} as const;

export const PARK_WORRY = {
  title: "Park it.",
  body: "This isn't settled and pretending otherwise would be a lie. But it doesn't have to be now. Pick when you'll come back to it.",
  options: ["Tonight", "Tomorrow morning", "The weekend"],
  /** No notification, no reminder — the deal is with themselves, not with us. */
  confirmation: "Fine. It'll keep until then.",
  done: "Done",
} as const;

/**
 * Hoisted only because `CLOSE` cannot refer to itself while being built. The
 * colon belongs to the spoken sentence `idea()` assembles, not to the label on
 * screen — see `ideaHeading`.
 */
const IDEA_LABEL = "Idea:";

export const CLOSE = {
  title: "That's all.",
  body: "Now try to unwind without your device for a while.",
  /**
   * One idea, picked at random, instead of the list of three the body used to
   * carry. A list is a decision to make and this screen is trying to end the
   * session, not start a new one — a single suggestion is easier to either take
   * or ignore.
   *
   * Every entry has to be doable with the phone face-down: that is the whole
   * qualification, and the reason none of them names an app. Written without
   * closing punctuation so the template supplies it and they stay uniform.
   */
  ideas: [
    "Go master your hobby",
    "Go read a chapter or two of your favorite book",
    "Go talk to a family member",
    "Go for a walk outside (if weather permits)",
    "Watch a couple episodes of your favorite show, or discover a new one",
    "Bundle up and watch your favorite movie, or discover a new one",
  ],
  /**
   * The label, stacked above the suggestion rather than running into it — see
   * `close.tsx`. No colon: it sits in the eyebrow slot now, and a colon is a
   * mark for joining two things on one line. Nothing else in the app's eyebrows
   * carries one either.
   */
  ideaHeading: "Idea",
  /**
   * The whole thing as one sentence, which is what the screen hands to a screen
   * reader — label, colon and suggestion read in one breath rather than as two
   * unrelated items. This is where the colon lives.
   */
  idea: (idea: string) => `${IDEA_LABEL} ${idea}.`,
  /** The only action on the screen. No rating, no share, no "come back". */
  done: "Close",
} as const;

/**
 * Picked once per visit, in the screen's initial state — not on every render,
 * which would reshuffle the suggestion under the user while they read it.
 */
export function pickUnwindIdea(): string {
  return CLOSE.ideas[Math.floor(Math.random() * CLOSE.ideas.length)];
}

/**
 * The last thing in the app. One line, and one quiet link under it — see
 * `closed.tsx` for why everything else about this screen is a dead end on
 * purpose, and why the tip jar is allowed to be the exception.
 */
export const CLOSED = {
  line: "You may now close the app.",
  /**
   * The only thing in the app that asks for anything, and it is asked once, at
   * the end, of somebody who is already done. Worded as an offer rather than a
   * request — no "support the app", no "if this helped", neither of which a
   * person is in a position to weigh up on the screen that just told them to
   * put the phone down.
   *
   * The arrow is the same one the source links on the calibration screen carry:
   * this leaves the app, and the label should say so before it is tapped.
   */
  tip: "Buy me a coffee →",
  /**
   * The line above it, which is what makes the link an offer rather than an
   * ask. "Free forever" first, because it is the part that is true whatever
   * anybody does next — the screen has to say the app is not waiting on this
   * before it says there is a way to give anything.
   *
   * Ends on a colon and runs straight into the label under it: the two are one
   * sentence, and the link is its object — which is also why they are set at
   * the same size, a step under the sign-off above them. Weight and colour are
   * what separate the two halves.
   */
  tipLead: "If you would like to support the app:",
  /** Read out in full, because an arrow is not a word. */
  tipLabel: "Buy me a coffee. Opens in your browser.",
  tipUrl: "https://buymeacoffee.com/lucaswaunn",
} as const;

/**
 * The progress row at the top of every session screen, in words.
 *
 * Nothing here is drawn — the indicator is three dots and no labels, because a
 * row of captions at the top of a screen that is asking someone how anxious
 * they are is a second thing to read before the first one. The names exist for
 * the screen reader, which cannot see that a dot is filled, and the sentence is
 * the whole of what it says: where you are, and how many parts there are.
 */
export const PROGRESS = {
  breath: "Breathing",
  game: "Puzzle",
  oneMore: "One more thing",
  /** Read out in place of the dots, which are three unlabelled circles. */
  label: (name: string, step: number, total: number) =>
    `${name}. Part ${step} of ${total}.`,
} as const;
