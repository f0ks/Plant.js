import type { Board } from "./board.ts";
import type { Direction, State } from "./state.ts";
import { DIRECTIONS, applyPush } from "./state.ts";
import { computeReachable } from "./reachability.ts";

/**
 * Structural level checks per docs/level-generation.md §5 — validated at
 * parse/generation time, not search time. Independent of deadlock
 * detection: a level can fail these and still be "solvable" in the search
 * sense, but it's not a well-formed level.
 */
export interface StructuralIssue {
  code:
    | "not-closed"
    | "isolated-floor"
    | "box-goal-mismatch"
    | "box-on-goal-at-start";
  message: string;
}

function neighbor(board: Board, cell: number, dir: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

export function validateStructure(board: Board, state: State): StructuralIssue[] {
  const issues: StructuralIssue[] = [];

  // Ignore boxes as obstacles: floor connectivity, not current reachability,
  // is what "closed" and "no isolated regions" are about (a box can always
  // be pushed out of the way eventually).
  const reachable = computeReachable(board, [], state.player);

  let notClosed = false;
  for (let cell = 0; cell < board.floor.length; cell++) {
    if (!board.floor[cell] || !reachable[cell]) continue;
    const x = cell % board.width;
    const y = (cell - x) / board.width;
    if (x === 0 || x === board.width - 1 || y === 0 || y === board.height - 1) {
      notClosed = true;
      break;
    }
  }
  if (notClosed) {
    issues.push({
      code: "not-closed",
      message: "board is not fully enclosed by walls (reachable floor touches the grid edge)",
    });
  }

  // Unreachable *plain* floor is common and harmless in hand-drawn XSB art
  // (ragged-edge padding, purely decorative corners) — real Microban data
  // has it on 147/155 levels. What actually matters is a goal or box the
  // player can never reach at all, which is a genuine defect (confirmed
  // against Microban: only one level trips this, a deliberately maze-like
  // showcase level with disconnected decorative rooms — see
  // docs/level-generation.md's Phase 3 note).
  const unreachableGoalOrBox =
    board.goals.some((g) => !reachable[g]) || state.boxes.some((b) => !reachable[b]);
  if (unreachableGoalOrBox) {
    issues.push({
      code: "isolated-floor",
      message: "level has a goal or box unreachable from the player's start",
    });
  }

  if (state.boxes.length !== board.goals.length) {
    issues.push({
      code: "box-goal-mismatch",
      message: `box count (${state.boxes.length}) does not equal goal count (${board.goals.length})`,
    });
  }

  for (const box of state.boxes) {
    if (board.isGoal[box]) {
      issues.push({
        code: "box-on-goal-at-start",
        message: `box at cell ${box} starts already on a goal`,
      });
    }
  }

  return issues;
}

const LETTER_DIRECTIONS: Record<string, Direction> = {
  u: DIRECTIONS.up,
  d: DIRECTIONS.down,
  l: DIRECTIONS.left,
  r: DIRECTIONS.right,
};

/**
 * Replays a u/d/l/r solution string (push = uppercase, the same convention
 * `solver.ts` emits) against `initialState` and reports whether every box
 * present at the start was pushed at least once — the last of §5's
 * structural checks, which can only be evaluated once a solution exists.
 */
export function everyBoxMovedInSolution(
  board: Board,
  initialState: State,
  solution: string,
): boolean {
  const originOf = new Map<number, number>();
  for (const box of initialState.boxes) originOf.set(box, box);
  const touchedOrigins = new Set<number>();

  let state = initialState;

  for (const ch of solution) {
    const dir = LETTER_DIRECTIONS[ch.toLowerCase()];
    if (!dir) {
      throw new Error(
        `everyBoxMovedInSolution: invalid solution character ${JSON.stringify(ch)}`,
      );
    }

    if (ch === ch.toUpperCase()) {
      const boxCell = neighbor(board, state.player, dir);
      if (boxCell === null || !state.boxes.includes(boxCell)) {
        throw new Error(
          `everyBoxMovedInSolution: no box to push at step ${JSON.stringify(ch)}`,
        );
      }
      const origin = originOf.get(boxCell);
      const destination = neighbor(board, boxCell, dir)!;
      state = applyPush(board, state, boxCell, dir);
      if (origin !== undefined) {
        originOf.delete(boxCell);
        originOf.set(destination, origin);
        touchedOrigins.add(origin);
      }
    } else {
      const next = neighbor(board, state.player, dir);
      if (next === null || board.walls[next] || !board.floor[next] || state.boxes.includes(next)) {
        throw new Error(
          `everyBoxMovedInSolution: illegal walk step ${JSON.stringify(ch)}`,
        );
      }
      state = { ...state, player: next };
    }
  }

  return touchedOrigins.size === initialState.boxes.length;
}
