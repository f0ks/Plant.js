import type { Board } from "../board.ts";
import type { Direction, State } from "../state.ts";
import { legalPushes } from "../state.ts";

function neighbor(board: Board, cell: number, dir: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

function perpendicular(dir: Direction): [Direction, Direction] {
  return dir.dx !== 0 ? [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }] : [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
}

/** Is `cell` in a 1-wide corridor oriented along `direction` (both perpendicular neighbors are walls/off-board)? */
export function isInTunnel(board: Board, cell: number, direction: Direction): boolean {
  const [p1, p2] = perpendicular(direction);
  const blocked = (dir: Direction) => {
    const n = neighbor(board, cell, dir);
    return n === null || board.walls[n] === 1;
  };
  return blocked(p1) && blocked(p2);
}

/** Is pushing a box from `from` to `to` in `direction` a straight tunnel push? */
export function isTunnelPush(board: Board, from: number, to: number, direction: Direction): boolean {
  return isInTunnel(board, from, direction) && isInTunnel(board, to, direction);
}

function pushDirectionsByBox(board: Board, state: State, boxes: readonly number[]): Map<number, Set<string>> {
  const wanted = new Set(boxes);
  const map = new Map<number, Set<string>>();
  for (const push of legalPushes(board, state)) {
    if (!wanted.has(push.box)) continue;
    const key = `${push.direction.dx},${push.direction.dy}`;
    if (!map.has(push.box)) map.set(push.box, new Set());
    map.get(push.box)!.add(key);
  }
  return map;
}

function sameDirectionMaps(a: Map<number, Set<string>>, b: Map<number, Set<string>>): boolean {
  if (a.size !== b.size) return false;
  for (const [box, dirs] of a) {
    const otherDirs = b.get(box);
    if (!otherDirs || otherDirs.size !== dirs.size) return false;
    for (const d of dirs) if (!otherDirs.has(d)) return false;
  }
  return true;
}

/**
 * A "no influence push" (wiki): a straight tunnel push whose destination
 * isn't a goal (so we don't blindly skip past a spot the solution might
 * want the box to stop on), and which leaves every other box's set of
 * legal push directions unchanged -- the player's and every other box's
 * options are exactly as they were, so committing to this push loses
 * nothing and can be done without branching.
 */
export function isNoInfluencePush(
  board: Board,
  stateBefore: State,
  stateAfter: State,
  box: number,
  destination: number,
  direction: Direction,
): boolean {
  if (board.isGoal[destination]) return false;
  if (!isTunnelPush(board, box, destination, direction)) return false;

  const otherBoxes = stateBefore.boxes.filter((b) => b !== box);
  const before = pushDirectionsByBox(board, stateBefore, otherBoxes);
  const after = pushDirectionsByBox(board, stateAfter, otherBoxes);
  return sameDirectionMaps(before, after);
}
