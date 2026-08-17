/**
 * The progressive muscle relaxation routines, as data.
 *
 * Same shape and same reasons as `breathwork.ts`, `somatic.ts` and
 * `one-more.ts`: plain data with no components in it, so the list can be read
 * and tested without a renderer. The thing that walks a routine lives in
 * `session/pmr/`.
 *
 * ## There is more than one of these, and it is a ladder rather than a menu
 *
 * This mattered enough to shape the whole file. The question was whether PMR is
 * one technique or several, and the answer is that it is one technique with a
 * documented sequence of shortenings, each of which was published, tested, and
 * is used as its own thing:
 *
 *  1. Jacobson's original, sixteen muscle groups, which runs twenty minutes and
 *     upwards and was taught over many sessions.
 *  2. Bernstein and Borkovec's abbreviated training, which cut sixteen to seven
 *     and seven to four. Their four is `four-group` below and their seven is
 *     `seven-group`; the sixteen is not here because it does not fit in a phone
 *     at the end of a session, and `PMR_COPY.cautionsLimit` says so.
 *  3. Öst's applied relaxation, which continues the ladder past the tensing:
 *     release-only drops the tense half, and cue-controlled pairs a word with
 *     the exhale so the whole thing can be triggered in a lift. Those are
 *     `release-only` and `cue`.
 *
 * So the four here are not four flavours of the same length — they are the same
 * technique at four points on a ladder, and the order they appear in is the
 * order they are learned in: longest first, each one a shortening of the one
 * above it. That is worth saying to the user rather than hiding, and
 * `PMR_COPY.lead` says it — the long ones teach your body what letting go feels
 * like, and the short ones are what you actually use once it knows. Somebody
 * who only ever runs `cue` has the taster and not the thing.
 *
 * It is the one picker in the app that does not lead with the option asking
 * least of the user, and `pmr.test.ts` holds the order against the copy. The
 * alternative was leading with the four-group routine as a recommended default,
 * which reads better and would make the lead's "in the order it is normally
 * learned" a sentence pointing at a list that isn't in that order.
 *
 * ## What is not here
 *
 * Relaxation through recall, and recall with counting — the two rungs between
 * the four-group routine and release-only. They are real and they were left out
 * for the same reason the sixteen-group version was: recall means reproducing a
 * relaxation you have already been trained into, and a first-time user has
 * nothing to recall. Nothing in this app can tell the difference between the
 * person who has done this for six weeks and the person who has never done it.
 *
 * ## `evidence` is not marketing
 *
 * Same field and same rule as the breathing catalog: it says what was measured
 * and in whom, and where the finding is weaker than the reputation it says so.
 * On this list the honest note is a dose one — the trials that produced the big
 * effects ran twenty to twenty-five minutes with a trainer in the room, and
 * every routine here is a fraction of that. Each `evidence` line carries its
 * own version of that caveat rather than leaving it to be inferred.
 *
 * The rules that apply to all four — three-quarters not maximum, skip what
 * hurts, keep breathing, stop if relaxing makes it worse — are not repeated per
 * routine. They are in `PMR_COPY` and shown once, above the list.
 */

import { describeLength } from '@/content/duration';

export type PmrRoutineId = 'four-group' | 'seven-group' | 'release-only' | 'cue';

/**
 * Whether a routine tenses before it releases, and what the release is paired
 * with.
 *
 * `release-only` and `cue` differ by less than their names suggest — both walk
 * the body letting go without tensing first — and the difference is real
 * anyway: the cue routine hangs each release on an out-breath and a word, which
 * is the whole mechanism it is named for. See its `evidence`.
 */
export type PmrMode = 'tense-release' | 'release-only' | 'cue';

export interface PmrGroup {
  /** What is being worked on, in the words a person would use for it. */
  name: string;
  /**
   * How to tense it. Null on the routines that do not tense, which is enforced
   * both ways in `pmr.test.ts` — a tense-release routine with a null here would
   * silently drop a step, and a release-only routine with a string here would
   * silently grow one.
   */
  tense: string | null;
  /** What to do on the release, which is the half that does the work. */
  release: string;
}

export interface PmrRoutine {
  id: PmrRoutineId;
  /** What it is. Named, not described — the blurb does that. */
  title: string;
  /**
   * The shape as a count, which is how these are named in the manuals: "four
   * muscle groups", "seven muscle groups". Shown on its own in the eyebrow slot
   * on the intro screen, and it says whether there is tensing, because that is
   * the one fact that makes a routine unavailable to somebody.
   */
  count: string;
  /** One line for the card, opening with `count`. */
  blurb: string;
  mode: PmrMode;
  groups: readonly PmrGroup[];
  /** How long each tense is held. Zero on the routines that do not tense. */
  tenseSeconds: number;
  /** How long each release runs. Always the longer of the two. */
  releaseSeconds: number;
  /** The word, on the cue routine. Null everywhere else. */
  word: string | null;
  /** How to do it, read on the intro screen before starting. */
  steps: readonly string[];
  /** What to pay attention to, and what the unhelpful version feels like. */
  notice: string;
  /** What is actually known about this one. See the note above. */
  evidence: string;
}

/**
 * Six seconds of tension and eighteen of release, everywhere it applies.
 *
 * The tension figure is the one number here taken straight from the literature:
 * Bernstein and Borkovec settled on five to seven seconds and the scripts
 * written from them have used it ever since. Long enough to feel where the
 * muscle is, short enough not to start cramping.
 *
 * The release is three times that, which is the shape every published script
 * agrees on even where they disagree on the number — the published releases run
 * anywhere from ten seconds to forty. Eighteen sits inside that and is what the
 * routines below add up to something reasonable with. What matters is the
 * ratio: the tensing is a way of finding the muscle, and the letting go is the
 * exercise. A release shorter than its tense would be doing the technique
 * backwards.
 *
 * Held here rather than on each routine because two of the four have no tense
 * phase at all, and a per-routine number would make it look as though the
 * lengths were tuned per routine when the only thing that varies is how many
 * groups there are.
 */
const TENSE_SECONDS = 6;
const RELEASE_SECONDS = 18;

/**
 * The release-only and cue routines run their own, shorter, because there is no
 * tension to recover from — the phase is a letting-go rather than a letting-go
 * plus the settling that follows a squeeze.
 */
const RELEASE_ONLY_SECONDS = 15;
/** One unhurried breath, which is what a cued release is hung on. */
const CUE_SECONDS = 10;

export const PMR_ROUTINES: readonly PmrRoutine[] = [
  {
    id: 'seven-group',
    title: 'Seven groups',
    count: '7 groups, tense and release',
    blurb: '7 groups, tense and release. Arm by arm, leg by leg. The fullest one here.',
    mode: 'tense-release',
    tenseSeconds: TENSE_SECONDS,
    releaseSeconds: RELEASE_SECONDS,
    word: null,
    groups: [
      {
        name: 'Your writing hand and arm',
        tense: 'Make a fist and pull it up towards your shoulder, tightening the whole arm.',
        release: 'Let it drop. Notice it lying heavier than the other one.',
      },
      {
        name: 'Your other hand and arm',
        tense: 'The same on that side. Fist, curl it up, tighten the whole arm.',
        release: 'Drop it. Both arms lying there now, doing nothing.',
      },
      {
        name: 'Face',
        tense: 'Raise your eyebrows, screw your eyes shut, and clench your jaw all at once.',
        release: 'Let your whole face go. Forehead smooth, teeth apart.',
      },
      {
        name: 'Neck and throat',
        tense: 'Press your chin gently down towards your chest while resisting it slightly. Gently.',
        release: 'Let your head sit wherever it balances on its own.',
      },
      {
        name: 'Chest, shoulders, back and stomach',
        tense: 'Shoulder blades together, stomach tight. Keep breathing while you do.',
        release: 'Let the whole middle of you go loose.',
      },
      {
        name: 'One leg and foot',
        tense: 'Straighten one leg, tighten the thigh, pull the toes back up towards you.',
        release: 'Let it fall. Heavy from the hip down.',
      },
      {
        name: 'The other leg and foot',
        tense: 'The same on the other side. Straighten, tighten, toes back towards you.',
        release: 'Let it go. Both legs heavy now, nothing holding them up.',
      },
    ],
    steps: [
      'Sit back or lie down. This one takes about three minutes, so get comfortable first.',
      'Three-quarters tension, never maximum, and let go all at once when it says to.',
      'Working one side at a time is the point of the longer version — it is easier to notice a loose arm next to a tight one.',
    ],
    notice:
      'Somewhere in the second half most people find a muscle they did not know was tight. That is the whole reason the longer version exists: four groups is faster, seven is more likely to catch the one that was actually holding on.',
    evidence:
      'Seven groups is the middle rung of the standard clinical protocol — Bernstein and Borkovec cut Jacobson\'s sixteen groups down to seven, then to four, and the ladder is meant to be climbed downwards as you get better at it. This is the closest thing on the list to the length the trials actually used, and it is still under half of one. The shorter routines below are what the protocol expects you to move to, not a lesser version of this.',
  },
  {
    id: 'four-group',
    // Named for what you do rather than for the manual's count. "Abbreviated
    // progressive relaxation training" is what this is called by people who
    // already know what it is.
    title: 'Four groups',
    count: '4 groups, tense and release',
    blurb: '4 groups, tense and release. Arms, face, middle, legs. The standard short version.',
    mode: 'tense-release',
    tenseSeconds: TENSE_SECONDS,
    releaseSeconds: RELEASE_SECONDS,
    word: null,
    groups: [
      {
        name: 'Both hands and arms',
        tense: 'Make a fist with both hands and pull them up towards your shoulders, tightening the whole arm.',
        release:
          'Drop them. Let your arms lie where they land and feel the difference between that and a second ago.',
      },
      {
        name: 'Face and neck',
        tense: 'Screw your eyes shut, clench your jaw, and press your tongue to the roof of your mouth.',
        release: 'Let all of it go slack. Your jaw should come apart on its own.',
      },
      {
        name: 'Chest, shoulders and stomach',
        tense: 'Pull your shoulder blades together and tighten your stomach. Keep breathing while you do.',
        release: 'Let your shoulders fall forward and your stomach go soft.',
      },
      {
        name: 'Legs and feet',
        tense: 'Straighten your legs, tighten your thighs, and pull your toes back up towards you.',
        release: 'Let them drop. Heavy legs, feet doing nothing.',
      },
    ],
    steps: [
      'Sit back or lie down. Nothing crossed, nothing propped up on anything.',
      'When it says tense, tighten that part to about three-quarters — firm, never as hard as you can.',
      'When it says let go, let go all at once rather than easing off. The drop is the part that works.',
    ],
    notice:
      'The contrast is what you are after, not the relaxation on its own. You are teaching yourself what a tight shoulder feels like from the inside, so that later in the day you catch one without having to be told.',
    evidence:
      'Muscle relaxation is the best-supported thing on this list for anxiety right now. The 2024 review of brief interventions for state anxiety found that muscle-based exercises significantly reduced it — a combined effect around one standard deviation, and −1.57 in the strongest trial — while breathing exercises taken as a group did not. The catch is the dose: those sessions ran twenty to twenty-five minutes with a trainer in the room, and this is four groups in a minute and a half from a phone.',
  },
  {
    id: 'release-only',
    title: 'Letting go, no tensing',
    count: '6 areas, no tensing',
    blurb: '6 areas, no tensing. Head down to feet, just letting each one go.',
    mode: 'release-only',
    tenseSeconds: 0,
    releaseSeconds: RELEASE_ONLY_SECONDS,
    word: null,
    groups: [
      {
        name: 'Forehead and eyes',
        tense: null,
        release: 'Let your forehead smooth out and your eyes stop holding themselves open.',
      },
      {
        name: 'Jaw and mouth',
        tense: null,
        release: 'Let your teeth come apart. A jaw is meant to hang.',
      },
      {
        name: 'Shoulders and neck',
        tense: null,
        release: 'Let your shoulders drop away from your ears. They are probably higher than you think.',
      },
      {
        name: 'Hands and arms',
        tense: null,
        release: 'Let your hands open and your arms get heavy wherever they are resting.',
      },
      {
        name: 'Chest and stomach',
        tense: null,
        release: 'Let your stomach go soft. Nothing has to be held in.',
      },
      {
        name: 'Legs and feet',
        tense: null,
        release: 'Let your legs get heavy and your feet stop gripping the floor.',
      },
    ],
    steps: [
      'Sit back and let your eyes close if that is comfortable.',
      'Nothing is tightened here. Each part is named and you let go of whatever it is already holding.',
      'Some of them will not have been holding anything. Move on — that is a fine answer.',
    ],
    notice:
      'Without the tensing there is no obvious moment of release, so this one can feel like nothing is happening. What you are looking for is smaller: a shoulder that drops a centimetre, a jaw that comes apart. That is the whole event.',
    evidence:
      'This is the second stage of applied relaxation, which is the version of muscle relaxation that has been tested as a treatment in its own right. In trials for generalised anxiety disorder it came out roughly level with CBT immediately after treatment, though CBT pulled further ahead at a year and a recent network meta-analysis rated the evidence for relaxation therapy low-certainty. Dropping the tensing also makes this the routine to use if tensing is a bad idea for you — an injury, or pain that guards.',
  },
  {
    id: 'cue',
    // Named for what is on the screen rather than for "cue-controlled
    // relaxation", which is a phrase that has to be explained before it means
    // anything and explains nothing the user can act on.
    title: 'One word',
    count: '6 breaths, one word',
    blurb: '6 breaths, one word. Let something go on each breath out. The pocket version.',
    mode: 'cue',
    tenseSeconds: 0,
    releaseSeconds: CUE_SECONDS,
    word: 'Soften',
    groups: [
      {
        name: 'Jaw',
        tense: null,
        release: 'Breathe out, think the word, and let your jaw go with it.',
      },
      {
        name: 'Shoulders',
        tense: null,
        release: 'Next breath out, same word, and let your shoulders drop.',
      },
      {
        name: 'Hands',
        tense: null,
        release: 'Again — out, the word, and your hands open.',
      },
      {
        name: 'Stomach',
        tense: null,
        release: 'Out, the word, and your stomach goes soft.',
      },
      {
        name: 'Legs',
        tense: null,
        release: 'Out, the word, and your legs get heavy.',
      },
      {
        name: 'Anything left',
        tense: null,
        release: 'Last one. Out, the word, and let go of whatever is still holding on.',
      },
    ],
    steps: [
      'Breathe normally. Nothing about the breathing itself is being changed here.',
      'On each breath out, think the word on the screen and let the named part go.',
      'The word is the point. Use the same one every time so it starts to mean something on its own.',
    ],
    notice:
      'This is the one designed to be used away from a screen — in a meeting, on a bus, in the ten seconds before something you are dreading. It only becomes that once the word has been attached to a relaxation you can already produce.',
    evidence:
      'The cue-controlled stage of applied relaxation, compressed. In the actual protocol it comes after weeks of the longer routines, and that is the mechanism rather than a formality: the word works because it has been paired, over and over, with a letting-go you already know how to produce. One run of it here is a taster of the shape. If you want the version that works in a lift, this is the last rung of a ladder that starts at the top of this list.',
  },
] as const;

export function findRoutine(id: PmrRoutineId): PmrRoutine | undefined {
  return PMR_ROUTINES.find((routine) => routine.id === id);
}

/**
 * One beat of a routine, which is what the screen actually walks.
 *
 * Expanded here rather than in the component so the whole of a routine can be
 * checked without a renderer — the failure this guards against is a routine
 * that runs the wrong number of beats, which renders perfectly and is only
 * visible by sitting through it.
 */
export interface PmrStep {
  kind: 'tense' | 'release';
  /** The area, shown under the cue so it is never a guess which part is meant. */
  group: string;
  instruction: string;
  seconds: number;
}

export function routineSteps(routine: PmrRoutine): readonly PmrStep[] {
  return routine.groups.flatMap((group) => {
    const release: PmrStep = {
      kind: 'release',
      group: group.name,
      instruction: group.release,
      seconds: routine.releaseSeconds,
    };

    // `group.tense === null` is the belt to the mode's braces. A tense-release
    // routine cannot have a null here — `pmr.test.ts` enforces it — so this is
    // narrowing rather than a fallback, and it means the type says what the
    // test says.
    if (routine.mode !== 'tense-release' || group.tense === null) return [release];

    return [
      {
        kind: 'tense' as const,
        group: group.name,
        instruction: group.tense,
        seconds: routine.tenseSeconds,
      },
      release,
    ];
  });
}

/** The whole run, lead-in excluded — that belongs to the screen. */
export function routineRunMs(routine: PmrRoutine): number {
  return routineSteps(routine).reduce((total, step) => total + step.seconds * 1_000, 0);
}

/**
 * How long a routine takes, stated before the user commits to it.
 *
 * The length and nothing else, unlike `describeRun` for a breathing pattern,
 * which pairs the length with the round count. It does not need to: a
 * breathing pattern's eyebrow is "4 in, 6 out" and the round count is new
 * information, whereas a routine's eyebrow is already "7 groups, tense and
 * release". A line under it reading "7 parts, about three minutes" is the same
 * seven twice in two different nouns.
 *
 * Still its own function rather than the call inlined into the screen, for the
 * reason every one of these exists: the length is derived from the steps that
 * actually run, so the intro cannot promise two minutes and take three.
 */
export function describeRoutine(routine: PmrRoutine): string {
  return describeLength(routineRunMs(routine));
}
