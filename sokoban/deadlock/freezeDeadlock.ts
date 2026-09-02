import type { Board } from "../board.ts";

interface Dir {
  dx: number;
  dy: number;
}

const LEFT: Dir = { dx: -1, dy: 0 };
const RIGHT: Dir = { dx: 1, dy: 0 };
const UP: Dir = { dx: 0, dy: -1 };
const DOWN: Dir = { dx: 0, dy: 1 };

function neighbor(board: Board, cell: number, dir: Dir): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

/**
 * Is pushing the box at `cell` in `dir` permanently impossible? True if
 * either the destination or the required player-standing cell (opposite
 * side) is a wall/off-board, or is occupied by another box that is itself
 * frozen (a frozen box is a permanent obstacle on either side of a push,
 * per the wiki's "deadlocks due to frozen boxes"). A non-frozen box
 * occupying either side is *not* a permanent block -- it might move away.
 */
function directionBlocked(
  board: Board,
  boxSet: ReadonlySet<number>,
  cell: number,
  dir: Dir,
  assumed: Set<number>,
  resolved: Map<number, boolean>,
): boolean {
  const destination = neighbor(board, cell, dir);
  const playerSide = neighbor(board, cell, { dx: -dir.dx, dy: -dir.dy });

  if (destination === null || board.walls[destination]) return true;
  if (playerSide === null || board.walls[playerSide]) return true;
  if (boxSet.has(destination) && checkFrozen(board, boxSet, destination, assumed, resolved)) {
    return true;
  }
  if (boxSet.has(playerSide) && checkFrozen(board, boxSet, playerSide, assumed, resolved)) {
    return true;
  }
  return false;
}

function checkFrozen(
  board: Board,
  boxSet: ReadonlySet<number>,
  cell: number,
  assumed: Set<number>,
  resolved: Map<number, boolean>,
): boolean {
  const cached = resolved.get(cell);
  if (cached !== undefined) return cached;
  // A box currently being examined higher up the recursion stack is
  // tentatively treated as frozen to break cycles -- sound because a cycle
  // means the boxes involved can only move if each other moves first,
  // which is impossible.
  if (assumed.has(cell)) return true;

  assumed.add(cell);
  const horizontalBlocked =
    directionBlocked(board, boxSet, cell, LEFT, assumed, resolved) &&
    directionBlocked(board, boxSet, cell, RIGHT, assumed, resolved);
  const verticalBlocked =
    directionBlocked(board, boxSet, cell, UP, assumed, resolved) &&
    directionBlocked(board, boxSet, cell, DOWN, assumed, resolved);
  assumed.delete(cell);

  const frozen = horizontalBlocked && verticalBlocked;
  // Only memoize a result computed as a "root" query (no other box's
  // cycle-breaking assumption still active on the stack). A result reached
  // while `assumed` is non-empty may have leaned on assuming some other,
  // still-in-progress box is frozen -- if that box later resolves to
  // *not* frozen, this result would've been wrong too, so it must not be
  // cached as if it were unconditionally true.
  if (assumed.size === 0) {
    resolved.set(cell, frozen);
  }
  return frozen;
}

/** Is the box at `cell` permanently immovable, given the other boxes on the board? */
export function isFrozen(board: Board, boxes: readonly number[], cell: number): boolean {
  return checkFrozen(board, new Set(boxes), cell, new Set(), new Map());
}

/**
 * True if any box in `boxes` is frozen while not sitting on a goal --
 * frozen boxes on a goal are fine (the wiki: "Frozen boxes don't create a
 * Freeze deadlock when being located on a goal").
 */
export function hasFreezeDeadlock(board: Board, boxes: readonly number[]): boolean {
  const boxSet = new Set(boxes);
  const assumed = new Set<number>();
  const resolved = new Map<number, boolean>();
  for (const box of boxes) {
    if (board.isGoal[box]) continue;
    if (checkFrozen(board, boxSet, box, assumed, resolved)) return true;
  }
  return false;
}
