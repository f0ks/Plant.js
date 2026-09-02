import type { Board } from "./board";
import { computeReachable } from "./reachability";

/**
 * A search-node state: the player's position and the multiset of box
 * positions. Immutable — box positions are kept sorted for canonical
 * ordering (dedup relies on it), and every mutation produces a new object.
 */
export interface State {
  boxes: number[];
  player: number;
}

export function sortedBoxes(boxes: Iterable<number>): number[] {
  return [...boxes].sort((a, b) => a - b);
}

export interface Direction {
  dx: number;
  dy: number;
}

export const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} as const satisfies Record<string, Direction>;

export type DirectionName = keyof typeof DIRECTIONS;

export interface Push {
  box: number;
  direction: Direction;
  state: State;
}

/** Neighbor of `cell` one step in `direction`, or null if off the board. */
function step(board: Board, cell: number, direction: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + direction.dx;
  const ny = y + direction.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

/**
 * Is pushing the box at `box` in `direction` legal in `state`? Requires the
 * player to be standing directly behind the box (opposite the push
 * direction) and the destination cell to be open floor, not a wall and not
 * occupied by another box. Does not itself verify the player can *reach*
 * that behind-the-box cell — see `legalPushes` for that.
 */
export function isLegalPush(
  board: Board,
  state: State,
  box: number,
  direction: Direction,
): boolean {
  const behind = step(board, box, { dx: -direction.dx, dy: -direction.dy });
  if (behind === null || behind !== state.player) return false;

  const destination = step(board, box, direction);
  if (destination === null) return false;
  if (board.walls[destination] || !board.floor[destination]) return false;
  if (state.boxes.includes(destination)) return false;

  return true;
}

/** Applies a legal push, returning the resulting state. Throws if illegal. */
export function applyPush(
  board: Board,
  state: State,
  box: number,
  direction: Direction,
): State {
  if (!isLegalPush(board, state, box, direction)) {
    throw new Error(
      `applyPush: illegal push of box ${box} in direction (${direction.dx}, ${direction.dy})`,
    );
  }
  const destination = step(board, box, direction)!;
  const boxes = sortedBoxes(state.boxes.map((b) => (b === box ? destination : b)));
  return { boxes, player: box };
}

/**
 * All pushes available to the player from `state`: for every box the
 * player can currently reach the "pushing side" of, in every direction that
 * results in a legal push.
 */
export function legalPushes(board: Board, state: State): Push[] {
  const reachable = computeReachable(board, state.boxes, state.player);
  const pushes: Push[] = [];

  for (const box of state.boxes) {
    for (const direction of Object.values(DIRECTIONS)) {
      const behind = step(board, box, { dx: -direction.dx, dy: -direction.dy });
      if (behind === null || !reachable[behind]) continue;
      if (!isLegalPush(board, { ...state, player: behind }, box, direction)) continue;

      const destination = step(board, box, direction)!;
      const boxes = sortedBoxes(state.boxes.map((b) => (b === box ? destination : b)));
      pushes.push({ box, direction, state: { boxes, player: box } });
    }
  }

  return pushes;
}

/**
 * Canonical dedup key for a state: the sorted box multiset plus a
 * normalized representative of the player's reachable region (its minimum
 * cell index), per the "normalizing the player position" technique — two
 * states with identical boxes and player positions in the same reachable
 * region are search-equivalent.
 */
export function stateKey(board: Board, state: State): string {
  const reachable = computeReachable(board, state.boxes, state.player);
  let representative = -1;
  for (let cell = 0; cell < reachable.length; cell++) {
    if (reachable[cell]) {
      representative = cell;
      break;
    }
  }
  return `${state.boxes.join(",")}|${representative}`;
}
