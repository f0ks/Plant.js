import type { Board } from "./board.ts";
import { computeReachable } from "./reachability.ts";
import type { Rng } from "./rng.ts";
import { randomInt, shuffle } from "./rng.ts";
import { sortedBoxes } from "./state.ts";

const BLOCK_SIZE = 3;

// Small 3x3 wall/floor template library ('#' = wall, ' ' = floor). Each
// placement applies a random rotation (0/90/180/270) and a random
// horizontal flip, so ~8 effective variants per template. Whole-board
// connectivity/openness/nook checks (below) are the actual acceptance
// gate — these templates don't need to tile validly on their own, unlike a
// classic Wang-tile scheme; see the plan's Design notes for the empirical
// success-rate table that justifies this choice over hand-matching edges.
const TEMPLATES: readonly string[][] = [
  ["   ", "   ", "   "],
  ["#  ", "   ", "   "],
  ["## ", "   ", "   "],
  ["#  ", "#  ", "   "],
  ["# #", "   ", "# #"],
  ["   ", " # ", "   "],
  ["#  ", "   ", "  #"],
  ["## ", "   ", " ##"],
];

function rotate(t: readonly string[]): string[] {
  const n = t.length;
  const out: string[] = [];
  for (let x = 0; x < n; x++) {
    let row = "";
    for (let y = n - 1; y >= 0; y--) row += t[y][x];
    out.push(row);
  }
  return out;
}

function flip(t: readonly string[]): string[] {
  return t.map((row) => [...row].reverse().join(""));
}

function randomVariant(rng: Rng, template: readonly string[]): string[] {
  let t: string[] = [...template];
  const rotations = randomInt(rng, 0, 3);
  for (let i = 0; i < rotations; i++) t = rotate(t);
  if (rng() < 0.5) t = flip(t);
  return t;
}

function stitchInterior(rng: Rng, blockCols: number, blockRows: number): string[] {
  const rows: string[] = new Array(blockRows * BLOCK_SIZE).fill("");
  for (let by = 0; by < blockRows; by++) {
    const blockRowStrings = new Array(BLOCK_SIZE).fill("");
    for (let bx = 0; bx < blockCols; bx++) {
      const template = TEMPLATES[randomInt(rng, 0, TEMPLATES.length - 1)];
      const variant = randomVariant(rng, template);
      for (let r = 0; r < BLOCK_SIZE; r++) blockRowStrings[r] += variant[r];
    }
    for (let r = 0; r < BLOCK_SIZE; r++) rows[by * BLOCK_SIZE + r] = blockRowStrings[r];
  }
  return rows;
}

function wrapWithBorder(interior: readonly string[]): string[] {
  const width = interior[0]?.length ?? 0;
  const top = "#".repeat(width + 2);
  const middle = interior.map((row) => `#${row}#`);
  return [top, ...middle, top];
}

function rowsToRoomBoard(rows: readonly string[]): Board {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const walls = new Uint8Array(width * height);
  const floor = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (rows[y][x] === "#") walls[idx] = 1;
      else floor[idx] = 1;
    }
  }
  return { width, height, walls, floor, goals: [], isGoal: new Uint8Array(width * height) };
}

function isFullyConnected(board: Board): boolean {
  let start = -1;
  for (let i = 0; i < board.floor.length; i++) {
    if (board.floor[i] && !board.walls[i]) {
      start = i;
      break;
    }
  }
  if (start === -1) return false;

  const reachable = computeReachable(board, [], start);
  for (let i = 0; i < board.floor.length; i++) {
    if (board.floor[i] && !board.walls[i] && !reachable[i]) return false;
  }
  return true;
}

function isOpenFloor(board: Board, x: number, y: number): boolean {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return false;
  const idx = y * board.width + x;
  return board.floor[idx] === 1 && board.walls[idx] === 0;
}

/** Rejects boards containing a fully-open 4x3 or 3x4 rectangle — Taylor &
 * Parberry's "boring flat area" reject rule from the room-building step. */
function hasOverOpenRectangle(board: Board): boolean {
  for (const [w, h] of [
    [4, 3],
    [3, 4],
  ] as const) {
    for (let y = 0; y <= board.height - h; y++) {
      for (let x = 0; x <= board.width - w; x++) {
        let allFloor = true;
        outer: for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            if (!isOpenFloor(board, x + dx, y + dy)) {
              allFloor = false;
              break outer;
            }
          }
        }
        if (allFloor) return true;
      }
    }
  }
  return false;
}

const ORTHOGONAL: readonly [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** Rejects boards with a floor cell walled in on 3 of its 4 sides. */
function hasThreeSidedNook(board: Board): boolean {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const idx = y * board.width + x;
      if (!board.floor[idx] || board.walls[idx]) continue;

      let wallSides = 0;
      for (const [dx, dy] of ORTHOGONAL) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) {
          wallSides++;
          continue;
        }
        const n = ny * board.width + nx;
        if (board.walls[n] || !board.floor[n]) wallSides++;
      }
      if (wallSides >= 3) return true;
    }
  }
  return false;
}

function isValidRoom(board: Board): boolean {
  return isFullyConnected(board) && !hasOverOpenRectangle(board) && !hasThreeSidedNook(board);
}

/**
 * Builds an empty room: tiles a `blockCols` x `blockRows` grid of randomly
 * rotated/flipped 3x3 templates, wraps it in a wall border (guaranteeing a
 * closed level per the XSB "closed" rule), and retries with fresh random
 * draws (same `rng` stream) up to `maxAttempts` times until the result
 * passes `isValidRoom`. Returns `null` if the budget is exhausted — see the
 * plan's Design notes for empirically-measured success rates per size.
 */
export function buildRoom(
  rng: Rng,
  blockCols: number,
  blockRows: number,
  maxAttempts = 300,
): Board | null {
  if (blockCols <= 0 || blockRows <= 0) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const interior = stitchInterior(rng, blockCols, blockRows);
    const rows = wrapWithBorder(interior);
    const board = rowsToRoomBoard(rows);
    if (isValidRoom(board)) return board;
  }
  return null;
}

const MIN_GOAL_SPACING = 2; // Chebyshev distance

function cellXY(board: Board, cell: number): [number, number] {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  return [x, y];
}

function chebyshevDistance(board: Board, a: number, b: number): number {
  const [ax, ay] = cellXY(board, a);
  const [bx, by] = cellXY(board, b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function isSpacedOut(board: Board, cells: readonly number[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (chebyshevDistance(board, cells[i], cells[j]) < MIN_GOAL_SPACING) return false;
    }
  }
  return true;
}

/**
 * Places `boxCount` goals on distinct floor cells, at least
 * `MIN_GOAL_SPACING` apart (Chebyshev distance) so the reverse
 * farthest-state search (Task 6) has room to spread boxes out instead of
 * starting from a degenerate clump. This spacing rule is this
 * implementation's own choice, not something docs/level-generation.md's
 * source material specified beyond "brute-force search over goal-position
 * combinations" — see the plan's Design notes.
 *
 * Randomized rather than a true combinatorial brute force (which is
 * intractable for anything but a tiny floor), per the doc's own "seed-
 * shuffle the search order for reproducibility and stop at the first
 * accepted arrangement" framing: each attempt reshuffles the floor-cell
 * list (consuming further `rng` state, so attempts differ and the whole
 * search is reproducible per seed) and takes the first `boxCount` cells.
 */
export function placeGoals(
  board: Board,
  boxCount: number,
  rng: Rng,
  options: { maxAttempts?: number } = {},
): number[] | null {
  const maxAttempts = options.maxAttempts ?? 500;

  const floorCells: number[] = [];
  for (let i = 0; i < board.floor.length; i++) {
    if (board.floor[i] && !board.walls[i]) floorCells.push(i);
  }
  if (floorCells.length < boxCount) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = shuffle(rng, floorCells).slice(0, boxCount);
    if (isSpacedOut(board, candidate)) return sortedBoxes(candidate);
  }
  return null;
}
