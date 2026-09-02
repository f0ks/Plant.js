import type { Board } from "../board.ts";
import type { Direction, State } from "../state.ts";
import { DIRECTIONS, legalPushes } from "../state.ts";
import { computeReachable } from "../reachability.ts";

function neighbor(board: Board, cell: number, dir: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

const ALL_DIRECTIONS = Object.values(DIRECTIONS);

/** A player-unreachable region of floor, and the boxes bordering it. */
export interface Corral {
  cells: number[];
  boxes: number[];
}

/**
 * Every maximal connected region of floor the player currently cannot
 * reach (excluding box-occupied cells, which aren't "region" cells
 * themselves -- they're what borders a region), paired with the boxes
 * adjacent to that region (the wiki's "corral": barrier boxes plus any
 * boxes fully interior to it). Does not combine adjacent corrals sharing a
 * blocked barrier box into multi-room corrals -- see docs/level-generation.md.
 */
export function findCorrals(board: Board, state: State): Corral[] {
  const reachable = computeReachable(board, state.boxes, state.player);
  const boxSet = new Set(state.boxes);
  const visited = new Uint8Array(board.width * board.height);
  const corrals: Corral[] = [];

  for (let cell = 0; cell < board.walls.length; cell++) {
    if (visited[cell] || board.walls[cell] || !board.floor[cell]) continue;
    if (reachable[cell] || boxSet.has(cell)) continue;

    const cells: number[] = [];
    const queue = [cell];
    visited[cell] = 1;
    while (queue.length > 0) {
      const c = queue.pop()!;
      cells.push(c);
      for (const dir of ALL_DIRECTIONS) {
        const n = neighbor(board, c, dir);
        if (n === null || visited[n] || board.walls[n] || !board.floor[n]) continue;
        if (reachable[n] || boxSet.has(n)) continue;
        visited[n] = 1;
        queue.push(n);
      }
    }

    const boxesAdjacent = new Set<number>();
    for (const c of cells) {
      for (const dir of ALL_DIRECTIONS) {
        const n = neighbor(board, c, dir);
        if (n !== null && boxSet.has(n)) boxesAdjacent.add(n);
      }
    }

    corrals.push({
      cells: cells.sort((a, b) => a - b),
      boxes: [...boxesAdjacent].sort((a, b) => a - b),
    });
  }

  return corrals;
}

/** Push directions for `box` that are structurally possible, ignoring the player's current position. */
function structurallyPossiblePushes(
  board: Board,
  boxSet: ReadonlySet<number>,
  box: number,
): Direction[] {
  const dirs: Direction[] = [];
  for (const dir of ALL_DIRECTIONS) {
    const behind = neighbor(board, box, { dx: -dir.dx, dy: -dir.dy });
    const destination = neighbor(board, box, dir);
    if (behind === null || destination === null) continue;
    if (board.walls[behind] || !board.floor[behind]) continue;
    if (board.walls[destination] || !board.floor[destination]) continue;
    if (boxSet.has(destination)) continue;
    dirs.push(dir);
  }
  return dirs;
}

/**
 * Is there a reason to treat `corral` as needing attention right now? True
 * iff it contains at least one goal that isn't currently filled -- the only
 * way to fill it is by pushing a box in through this corral's barrier. A
 * corral with no goal in it is never "unsatisfied": no push into it can
 * make progress, so it must not gate `isPICorral`-based search restriction
 * (which would otherwise force every candidate push down to that corral's
 * barrier boxes alone, even when none of them have any reason to move in).
 */
export function isCorralUnsatisfied(board: Board, state: State, corral: Corral): boolean {
  return corral.cells.some((c) => board.isGoal[c] === 1 && !state.boxes.includes(c));
}

/**
 * Is `corral` a PI-corral? Two conditions, both against `state` as it is
 * right now:
 *  - I-corral: every push of a barrier box that is *currently legal*
 *    (the player can actually perform it right now) leads into the corral
 *    -- no barrier box has a currently-available escape push elsewhere.
 *  - P (player): every push into the corral that is *structurally
 *    possible* (ignoring the player's current position) is *also*
 *    currently legal -- the player can reach every barrier box from every
 *    side needed to push it inward.
 */
export function isPICorral(board: Board, state: State, corral: Corral): boolean {
  const boxSet = new Set(state.boxes);
  const cellSet = new Set(corral.cells);
  const barrierBoxes = new Set(corral.boxes);

  const currentPushes = legalPushes(board, state).filter((p) => barrierBoxes.has(p.box));

  for (const push of currentPushes) {
    const destination = neighbor(board, push.box, push.direction)!;
    if (!cellSet.has(destination)) return false;
  }

  for (const box of corral.boxes) {
    for (const dir of structurallyPossiblePushes(board, boxSet, box)) {
      const destination = neighbor(board, box, dir)!;
      if (!cellSet.has(destination)) continue;
      const isCurrentlyLegal = currentPushes.some(
        (p) => p.box === box && p.direction.dx === dir.dx && p.direction.dy === dir.dy,
      );
      if (!isCurrentlyLegal) return false;
    }
  }

  return true;
}
