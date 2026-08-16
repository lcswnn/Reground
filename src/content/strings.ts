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
 * The door. One line, no button — it fades in, waits, and goes.
 *
 * An instruction rather than a greeting, because it is the only thing on screen
 * and nothing is waiting on the user to answer it. "How are you today?" needed
 * a button to be a question; this needs the user to do one thing, and the
 * screen holds still long enough for them to do it.
 *
 * The stretched vowel is the timing, written into the word. "Take a deep
 * breath" is read at the speed of any other sentence; this one can't be.
 */
export const WELCOME = {
  line: "Time to reground.",
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
 * The appearance switch, top-right on every screen.
 *
 * Both options are named and the current one is simply the one drawn in ink,
 * which is what makes it readable as a switch rather than as a label. A single
 * word — "Dark" — would have been quieter and would have had to mean two
 * different things depending on which mode you were already in, which is the
 * one thing a control in the corner of every screen cannot afford.
 *
 * Sentence case, not caps. This is chrome, and the app has exactly one other
 * piece of it (`BACK`) that this is meant to sit opposite without shouting.
 */
export const APPEARANCE = {
  light: "Light",
  dark: "Dark",
  /** Between the two. A divider, not a bullet — nothing is being listed. */
  separator: "·",
  /** Read out in place of the words, which are only half a sentence each. */
  label: (mode: "light" | "dark") =>
    mode === "dark" ? "Dark appearance" : "Light appearance",
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
   *
   * This used to end "…and Tully breathes with it", which stopped being true
   * the moment `SHOW_TULLY` went false in `breathing-guide.tsx`: the line
   * promised a character the next screen no longer has. Put the clause back
   * when the flag goes back up — it belongs with it, not without it.
   */
  shape: (rounds: number) =>
    `${rounds} rounds, about a minute. The circle grows as you breathe in and shrinks as you breathe out.`,
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
  prompt: "Fill the empty half so it mirrors the other one. Tap the squares, or drag across them.",
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
  /** Shown when the rating dropped by at least `MEANINGFUL_MOOD_DROP`. */
  improved: "Good. That was the point.",
  /**
   * Shown when it did not. Both answers now lead to the same screen — the
   * offer of one more thing — so this line no longer promises anything the
   * other one doesn't. What it still does is say the thing out loud, which is
   * the half of it that mattered.
   */
  unchanged: "That didn't shift it. One more thing, then we're done.",
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
 * Three of the five options have nothing behind them yet.
 *
 * They are still on the list and still tappable, and this is the screen that
 * makes that honest. It says the app hasn't built it — not that the user picked
 * wrong, and not that something went wrong — and it puts the way back to the
 * list next to the way out, because a dead end at the end of a session about
 * anxiety is a poor last impression.
 *
 * Delete an entry from here as each exercise lands, and this screen stops being
 * reachable at all when the last one does.
 */
export const NOT_YET = {
  eyebrow: "Not built yet",
  body: "This one isn't in the app yet — it's on the list. Pick something else, or call it here.",
  back: "Pick something else",
  done: "Finish up",
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

export const PARK_WORRY = {
  title: "Park it.",
  body: "This isn't settled and pretending otherwise would be a lie. But it doesn't have to be now. Pick when you'll come back to it.",
  options: ["Tonight", "Tomorrow morning", "The weekend"],
  /** No notification, no reminder — the deal is with themselves, not with us. */
  confirmation: "Fine. It'll keep until then.",
  done: "Done",
} as const;

/** Hoisted only because `CLOSE` cannot refer to itself while being built. */
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
   * Split out because the label is set in the semibold cut while the suggestion
   * itself is not — see `close.tsx`. `idea()` still assembles the whole line,
   * which is what the screen hands to a screen reader.
   */
  ideaLabel: IDEA_LABEL,
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
 * The last thing in the app. One line, and nothing to tap — see `closed.tsx`
 * for why it is a dead end on purpose.
 */
export const CLOSED = {
  line: "You may now close the app.",
} as const;
