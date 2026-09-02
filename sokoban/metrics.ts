import type { Board } from "./board.ts";
import type { Direction, State } from "./state.ts";
import { DIRECTIONS } from "./state.ts";

function neighbor(board: Board, cell: number, dir: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

const LETTER_DIRECTIONS: Record<string, Direction> = {
  u: DIRECTIONS.up,
  d: DIRECTIONS.down,
  l: DIRECTIONS.left,
  r: DIRECTIONS.right,
};

/** One push, identified by the pushed box's stable index into the initial state's box array (its cell changes every push, so the cell itself can't serve as identity) and the push direction. */
export interface PushEvent {
  boxIndex: number;
  direction: Direction;
}

/**
 * Replays a u/d/l/r solution string (push = uppercase, `solver.ts`'s
 * convention) against `initialState` and returns the ordered sequence of
 * push events, tracking each box's identity by its index into
 * `initialState.boxes` rather than by cell.
 */
export function pushEvents(board: Board, initialState: State, solution: string): PushEvent[] {
  const boxes = [...initialState.boxes];
  let player = initialState.player;
  const events: PushEvent[] = [];

  for (const ch of solution) {
    const dir = LETTER_DIRECTIONS[ch.toLowerCase()];
    if (!dir) throw new Error(`pushEvents: invalid solution character ${JSON.stringify(ch)}`);

    const target = neighbor(board, player, dir);
    if (target === null) throw new Error(`pushEvents: walked off the board at ${ch}`);

    const boxIndex = boxes.indexOf(target);
    if (boxIndex === -1) {
      player = target;
      continue;
    }

    const destination = neighbor(board, target, dir);
    if (destination === null) {
      throw new Error(`pushEvents: pushed a box off the board at ${ch}`);
    }
    boxes[boxIndex] = destination;
    player = target;
    events.push({ boxIndex, direction: dir });
  }

  return events;
}

/**
 * Taylor & Parberry's "box lines": counts pushes, but any run of consecutive
 * push events on the same box in the same direction counts once. Matches
 * their exact wording, so it merges across intervening walks (no push of a
 * different box) even if the direction repeats after a detour.
 */
export function boxLines(events: readonly PushEvent[]): number {
  let lines = 0;
  for (let i = 0; i < events.length; i++) {
    const prev = events[i - 1];
    const continuesRun =
      prev !== undefined &&
      prev.boxIndex === events[i].boxIndex &&
      prev.direction.dx === events[i].direction.dx &&
      prev.direction.dy === events[i].direction.dy;
    if (!continuesRun) lines++;
  }
  return lines;
}

/**
 * Taylor & Parberry's "box changes": how many times the player stopped
 * pushing one box, in any direction, and began pushing another.
 */
export function boxChanges(events: readonly PushEvent[]): number {
  let changes = 0;
  for (let i = 1; i < events.length; i++) {
    if (events[i].boxIndex !== events[i - 1].boxIndex) changes++;
  }
  return changes;
}

const ORTHOGONAL_DIRECTIONS = Object.values(DIRECTIONS);

/** Adjacency counts over a state's boxes and goals, feeding `score`'s touching bonuses/penalties. Each touching pair is counted once per side (so a box between two other boxes contributes 2 to boxTouchingBox). */
export interface TouchingCounts {
  boxTouchingWall: number;
  boxTouchingPlayer: number;
  boxTouchingBox: number;
  goalTouchingGoal: number;
}

export function countTouching(board: Board, state: State): TouchingCounts {
  const boxSet = new Set(state.boxes);
  let boxTouchingWall = 0;
  let boxTouchingPlayer = 0;
  let boxTouchingBox = 0;

  for (const box of state.boxes) {
    for (const dir of ORTHOGONAL_DIRECTIONS) {
      const n = neighbor(board, box, dir);
      if (n === null || board.walls[n]) {
        boxTouchingWall++;
        continue;
      }
      if (n === state.player) boxTouchingPlayer++;
      if (boxSet.has(n)) boxTouchingBox++;
    }
  }

  let goalTouchingGoal = 0;
  for (const goal of board.goals) {
    for (const dir of ORTHOGONAL_DIRECTIONS) {
      const n = neighbor(board, goal, dir);
      if (n !== null && board.isGoal[n]) goalTouchingGoal++;
    }
  }

  return { boxTouchingWall, boxTouchingPlayer, boxTouchingBox, goalTouchingGoal };
}

// Taylor & Parberry §3.3's post-base-score adjustments.
const TRAPPED_BOX_PENALTY = -100000;
const WALL_TOUCH_PENALTY = -150;
const PLAYER_TOUCH_BONUS = 50;
const BOX_TOUCH_BONUS = 30;
const GOAL_TOUCH_BONUS = 30;

export interface ScoreInputs {
  /** Push count of the level's optimal solution. */
  pushes: number;
  /** Box-line count of that same solution (see `boxLines`). */
  lines: number;
  /** Number of boxes in the level. */
  boxes: number;
  /** Number of other levels the generator found at the same search depth (0 outside a generator batch). */
  siblingLevels: number;
  /** Whether any box in the level's start state is permanently stuck (e.g. `hasFreezeDeadlock`). */
  trapped: boolean;
  touching: TouchingCounts;
  /** Random(0, 300) jitter; pass an explicit value for deterministic tests, omit to draw one. */
  random?: number;
}

/**
 * Taylor & Parberry §3.3's scoring formula:
 * `100 * (pushes - siblingLevels + 4*lines - 12*boxes) + Random(0, 300)`,
 * plus their post-score adjustments (trapped box, wall/player/box/goal
 * touching). A level is accepted iff the result is positive (`isAccepted`).
 */
export function score(inputs: ScoreInputs): number {
  const base =
    100 * (inputs.pushes - inputs.siblingLevels + 4 * inputs.lines - 12 * inputs.boxes);
  const jitter = inputs.random ?? Math.random() * 300;
  const touchingScore =
    inputs.touching.boxTouchingWall * WALL_TOUCH_PENALTY +
    inputs.touching.boxTouchingPlayer * PLAYER_TOUCH_BONUS +
    inputs.touching.boxTouchingBox * BOX_TOUCH_BONUS +
    inputs.touching.goalTouchingGoal * GOAL_TOUCH_BONUS;
  const trappedPenalty = inputs.trapped ? TRAPPED_BOX_PENALTY : 0;

  return base + jitter + touchingScore + trappedPenalty;
}

/** Taylor & Parberry: "Any level with a final score of 0 or less is rejected." */
export function isAccepted(finalScore: number): boolean {
  return finalScore > 0;
}
