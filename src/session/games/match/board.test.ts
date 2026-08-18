import { describe, expect, it } from 'vitest';

import {
  KINDS,
  areNeighbours,
  collapse,
  createBoard,
  findMatches,
  hasMove,
  makesMatch,
  reshuffle,
  swap,
  toKinds,
  type Kind,
  type Piece,
} from '@/session/games/match/board';

/**
 * A board written as letters, one per square: the first letter of each kind,
 * and a dot for an empty square. Thirty-six pieces listed out as objects is
 * unreadable, and every rule here is about what sits next to what.
 */
const LETTERS: Record<string, Kind> = {
  d: 'dot',
  r: 'ring',
  s: 'square',
  i: 'diamond',
  b: 'bar',
};

/**
 * Ids start high on purpose. The module hands out its own from a counter that
 * begins at zero and runs for the life of the process, so a hand-written board
 * numbered from one would collide with the pieces `collapse` creates — and the
 * tests that tell a survivor from a new piece by its id would quietly stop
 * testing anything.
 */
const HAND_MADE = 100_000;

function boardFrom(rows: string[]): Piece[] {
  const pieces: Piece[] = [];
  rows.forEach((line, row) =>
    [...line].forEach((letter, column) => {
      const kind = LETTERS[letter];
      if (kind) pieces.push({ id: HAND_MADE + pieces.length, kind, row, column });
    }),
  );
  return pieces;
}

/** The board back as letters, for comparing against another written one. */
function lettersOf(pieces: readonly Piece[], size: number): string[] {
  const initial = (kind: Kind | undefined) =>
    kind ? (Object.entries(LETTERS).find(([, value]) => value === kind)?.[0] ?? '?') : '.';

  return toKinds(pieces, size).map((row) => row.map(initial).join(''));
}

/** Ids of the matched pieces, as the letters and squares they sit on. */
function matchedCells(rows: string[]): string[] {
  const pieces = boardFrom(rows);
  const matched = findMatches(pieces, rows.length);

  return pieces
    .filter((piece) => matched.has(piece.id))
    .map((piece) => `${piece.row},${piece.column}`);
}

/** Dice that walk through a fixed list and then repeat it. */
function dice(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

describe('finding lines', () => {
  it('finds three across', () => {
    expect(
      matchedCells([
        'dddr',
        'rsri',
        'sisr',
        'iris',
      ]),
    ).toEqual(['0,0', '0,1', '0,2']);
  });

  it('finds three down', () => {
    expect(
      matchedCells([
        'dris',
        'dsri',
        'dirs',
        'rsdi',
      ]),
    ).toEqual(['0,0', '1,0', '2,0']);
  });

  it('takes the whole run when it is longer than three', () => {
    expect(matchedCells(['dddd', 'rsri', 'sisr', 'irsi'])).toHaveLength(4);
  });

  it('leaves a pair alone', () => {
    expect(matchedCells(['ddrs', 'rsri', 'sisr', 'irsi'])).toEqual([]);
  });

  /** The corner of an L belongs to both runs and must only be cleared once. */
  it('counts the corner of two crossing runs once', () => {
    const cells = matchedCells([
      'dddr',
      'dsri',
      'disr',
      'rsdi',
    ]);

    expect(cells).toEqual(['0,0', '0,1', '0,2', '1,0', '2,0']);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('does not run a line off the end of one row into the next', () => {
    expect(matchedCells(['rsd', 'ddr', 'sis'])).toEqual([]);
  });
});

describe('swapping', () => {
  const board = [
    'ddrs',
    'sidi',
    'rsid',
    'irsr',
  ];

  it('only counts an edge as neighbouring', () => {
    expect(areNeighbours({ row: 1, column: 1 }, { row: 1, column: 2 })).toBe(true);
    expect(areNeighbours({ row: 1, column: 1 }, { row: 2, column: 2 })).toBe(false);
    expect(areNeighbours({ row: 1, column: 1 }, { row: 1, column: 1 })).toBe(false);
  });

  it('exchanges two squares and leaves the rest where they were', () => {
    const pieces = boardFrom(board);
    const swapped = swap(pieces, { row: 0, column: 1 }, { row: 0, column: 2 });

    expect(lettersOf(swapped, 4)).toEqual(['drds', 'sidi', 'rsid', 'irsr']);
    expect(swapped.map((piece) => piece.id).sort()).toEqual(
      pieces.map((piece) => piece.id).sort(),
    );
  });

  it('judges a swap by the line it would make', () => {
    const pieces = boardFrom(board);

    // Pulling the third `d` up into the top row, against a swap that moves two
    // pieces and lines nothing up.
    expect(makesMatch(pieces, { row: 0, column: 2 }, { row: 1, column: 2 }, 4)).toBe(true);
    expect(makesMatch(pieces, { row: 3, column: 0 }, { row: 3, column: 1 }, 4)).toBe(false);
  });

  it('leaves the board alone when a square is empty', () => {
    const pieces = boardFrom(['dd', 'd.']);
    expect(lettersOf(swap(pieces, { row: 1, column: 0 }, { row: 1, column: 1 }), 2)).toEqual([
      'dd',
      'd.',
    ]);
  });
});

describe('collapsing', () => {
  const board = [
    'dsr',
    'isr',
    'rsi',
  ];

  /** The middle column, which is a run of three. */
  const cleared = (pieces: readonly Piece[]) => findMatches(pieces, 3);

  it('drops what was above into the gap and fills the top', () => {
    const pieces = boardFrom(board);
    const next = collapse(pieces, cleared(pieces), 3, dice([0]));

    const letters = lettersOf(next, 3);
    expect(letters.map((row) => row[0])).toEqual(['d', 'i', 'r']);
    expect(letters.map((row) => row[2])).toEqual(['r', 'r', 'i']);
    // Every square is filled again, and the new ones are the first kind the
    // dice ask for.
    expect(letters.map((row) => row[1]).join('')).toBe('ddd');
  });

  it('keeps the survivors identical and gives only the new ones a spawn', () => {
    const pieces = boardFrom(board);
    const next = collapse(pieces, cleared(pieces), 3, dice([0]));
    const survivors = next.filter((piece) => pieces.some((old) => old.id === piece.id));

    expect(survivors).toHaveLength(6);
    expect(survivors.every((piece) => piece.spawn === undefined)).toBe(true);

    const fresh = next.filter((piece) => !pieces.some((old) => old.id === piece.id));
    expect(fresh).toHaveLength(3);
    expect(fresh.every((piece) => (piece.spawn ?? 0) < 0)).toBe(true);
  });

  it('stacks a column of new pieces above one another rather than on one point', () => {
    const pieces = boardFrom(board);
    const fresh = collapse(pieces, cleared(pieces), 3, dice([0]))
      .filter((piece) => piece.spawn !== undefined)
      .sort((a, b) => a.row - b.row);

    expect(fresh.map((piece) => piece.spawn)).toEqual([-3, -2, -1]);
  });

  /**
   * A line across rather than down: three columns each losing one piece, so
   * every column has something to drop and something to be topped up with.
   */
  it('drops one into every column a line ran through', () => {
    const pieces = boardFrom(['ris', 'ddd', 'sri']);
    const next = collapse(pieces, findMatches(pieces, 3), 3, dice([0]));

    expect(lettersOf(next, 3)).toEqual(['ddd', 'ris', 'sri']);
    expect(next.filter((piece) => piece.spawn !== undefined)).toHaveLength(3);
    expect(new Set(next.map((piece) => `${piece.row},${piece.column}`)).size).toBe(9);
  });
});

describe('a board with nothing left to do', () => {
  /** No two of a kind adjacent anywhere, so no swap can make a line. */
  const dead = [
    'drsib',
    'sibdr',
    'bdrsi',
    'rsibd',
    'ibdrs',
  ];

  it('knows when there is a move and when there is not', () => {
    expect(hasMove(boardFrom(dead), 5)).toBe(false);
    expect(hasMove(boardFrom(['drdib', 'sdbdr', 'bdrsi', 'rsibd', 'ibdrs']), 5)).toBe(true);
  });

  it('deals the same pieces back out, keeping every one of them', () => {
    const pieces = boardFrom(dead);
    const next = reshuffle(pieces, 5, dice([0.17, 0.61, 0.43, 0.89, 0.05, 0.72, 0.33]));

    expect(next.map((piece) => piece.id).sort()).toEqual(
      pieces.map((piece) => piece.id).sort(),
    );

    const count = (list: readonly Piece[]) =>
      KINDS.map((kind) => list.filter((piece) => piece.kind === kind).length);
    expect(count(next)).toEqual(count(pieces));
  });

  it('deals out a board that can be played and is not already clearing', () => {
    const pieces = boardFrom(dead);
    const next = reshuffle(pieces, 5, dice([0.17, 0.61, 0.43, 0.89, 0.05, 0.72, 0.33]));

    expect(findMatches(next, 5).size).toBe(0);
    expect(hasMove(next, 5)).toBe(true);
  });

  it('covers every square exactly once', () => {
    const pieces = boardFrom(dead);
    const next = reshuffle(pieces, 5, dice([0.17, 0.61, 0.43, 0.89, 0.05, 0.72, 0.33]));

    expect(new Set(next.map((piece) => `${piece.row},${piece.column}`)).size).toBe(25);
  });
});

describe('a fresh board', () => {
  it('fills every square once', () => {
    const pieces = createBoard();

    expect(pieces).toHaveLength(36);
    expect(new Set(pieces.map((piece) => `${piece.row},${piece.column}`)).size).toBe(36);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(36);
  });

  /**
   * The two things a board has to be to be worth opening on: not already
   * clearing itself, and playable without a shuffle first. Run a few times over
   * real dice, since the guarantee is about the generator rather than one deal.
   */
  it('opens with no line already made and a swap available', () => {
    for (let deal = 0; deal < 25; deal += 1) {
      const pieces = createBoard();
      expect(findMatches(pieces).size).toBe(0);
      expect(hasMove(pieces)).toBe(true);
    }
  });

  it('only uses the five kinds', () => {
    expect(new Set(createBoard().map((piece) => piece.kind)).size).toBeLessThanOrEqual(
      KINDS.length,
    );
  });
});
