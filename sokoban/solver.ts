import type { Board } from "./board.ts";
import type { Direction, State } from "./state.ts";
import { legalPushes, sortedBoxes, stateKey } from "./state.ts";
import { findPath } from "./reachability.ts";
import { computeDeadSquares } from "./deadlock/staticDeadlock.ts";
import { hasFreezeDeadlock } from "./deadlock/freezeDeadlock.ts";
import { computeGoalDistanceTables, hungarianLowerBound } from "./heuristic.ts";
import { findCorrals, isPICorral, isCorralUnsatisfied } from "./deadlock/corral.ts";

export type DeadlockReason =
  | "bipartite"
  | "box_goal_mismatch"
  | "timeout"
  | "no_solution"
  | null;

export interface SolveOptions {
  /** Hard wall-clock budget in ms. Default 5000. */
  timeoutMs?: number;
}

export interface SolveResult {
  solvable: boolean;
  pushOptimal: boolean;
  /** Full move string: u/d/l/r, uppercase = push. */
  solution: string;
  moves: number;
  pushes: number;
  nodes: number;
  timeMs: number;
  deadlockReason: DeadlockReason;
}

function neighbor(board: Board, cell: number, dir: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

function directionLetter(dir: Direction): string {
  if (dir.dx === 0 && dir.dy === -1) return "u";
  if (dir.dx === 0 && dir.dy === 1) return "d";
  if (dir.dx === -1 && dir.dy === 0) return "l";
  if (dir.dx === 1 && dir.dy === 0) return "r";
  throw new Error(`directionLetter: not a unit direction (${dir.dx}, ${dir.dy})`);
}

function isSolved(board: Board, state: State): boolean {
  return state.boxes.every((box) => board.isGoal[box] === 1);
}

interface PushStep {
  box: number;
  direction: Direction;
}

interface Node {
  state: State;
  g: number;
  h: number;
  parent: Node | null;
  push: PushStep | null;
}

/** Minimal binary min-heap keyed by an externally supplied priority. */
class MinHeap<T> {
  private items: T[] = [];
  private readonly priority: (item: T) => number;

  constructor(priority: (item: T) => number) {
    this.priority = priority;
  }

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priority(this.items[parent]) <= this.priority(this.items[i])) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < n && this.priority(this.items[left]) < this.priority(this.items[smallest])) smallest = left;
        if (right < n && this.priority(this.items[right]) < this.priority(this.items[smallest])) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

function reconstructSolution(board: Board, initialState: State, goalNode: Node): { solution: string; pushes: number } {
  const chain: PushStep[] = [];
  let cur: Node | null = goalNode;
  while (cur && cur.push) {
    chain.push(cur.push);
    cur = cur.parent;
  }
  chain.reverse();

  let solution = "";
  let player = initialState.player;
  let boxes = initialState.boxes;

  for (const step of chain) {
    const behind = neighbor(board, step.box, { dx: -step.direction.dx, dy: -step.direction.dy })!;
    const walk = findPath(board, boxes, player, behind);
    if (walk === null) {
      throw new Error("reconstructSolution: internal error, player cannot reach a required push position");
    }
    solution += walk;
    solution += directionLetter(step.direction).toUpperCase();

    const destination = neighbor(board, step.box, step.direction)!;
    boxes = sortedBoxes(boxes.map((b) => (b === step.box ? destination : b)));
    player = step.box;
  }

  return { solution, pushes: chain.length };
}

/**
 * Push-optimal A* over push-states (Taylor & Parberry / the Solver wiki's
 * approach): g = pushes so far, h = Hungarian minimum-cost box-goal
 * matching by push distance (admissible). Successor states are pruned by
 * static dead squares, freeze deadlocks, the bipartite (no perfect
 * matching) case surfaced by the heuristic itself, and PI-corral pruning.
 *
 * Scope note: does not combine adjacent corrals into multi-room PI-corrals,
 * and does not fold tunnel "no-influence" pushes into a search macro (see
 * docs/level-generation.md) -- both are available as tested standalone
 * predicates for a future performance pass if Microban timing calls for it.
 */
export function solve(board: Board, initialState: State, options: SolveOptions = {}): SolveResult {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? 5000;
  const elapsed = () => Date.now() - startTime;

  if (initialState.boxes.length > board.goals.length) {
    return {
      solvable: false,
      pushOptimal: false,
      solution: "",
      moves: 0,
      pushes: 0,
      nodes: 0,
      timeMs: elapsed(),
      deadlockReason: "box_goal_mismatch",
    };
  }

  const deadSquares = computeDeadSquares(board);
  const goalTables = computeGoalDistanceTables(board);

  if (isSolved(board, initialState)) {
    return {
      solvable: true,
      pushOptimal: true,
      solution: "",
      moves: 0,
      pushes: 0,
      nodes: 0,
      timeMs: elapsed(),
      deadlockReason: null,
    };
  }

  const startBound = hungarianLowerBound(goalTables, initialState.boxes, board.goals);
  if (startBound.deadlock) {
    return {
      solvable: false,
      pushOptimal: false,
      solution: "",
      moves: 0,
      pushes: 0,
      nodes: 0,
      timeMs: elapsed(),
      deadlockReason: "bipartite",
    };
  }

  const startNode: Node = { state: initialState, g: 0, h: startBound.value, parent: null, push: null };
  const open = new MinHeap<Node>((n) => n.g + n.h);
  open.push(startNode);
  const bestG = new Map<string, number>();
  bestG.set(stateKey(board, initialState), 0);

  let nodes = 0;

  while (open.size > 0) {
    if (elapsed() >= timeoutMs) {
      return {
        solvable: false,
        pushOptimal: false,
        solution: "",
        moves: 0,
        pushes: 0,
        nodes,
        timeMs: elapsed(),
        deadlockReason: "timeout",
      };
    }

    const node = open.pop()!;
    const key = stateKey(board, node.state);
    if ((bestG.get(key) ?? Infinity) < node.g) continue;

    nodes++;

    if (isSolved(board, node.state)) {
      const { solution, pushes } = reconstructSolution(board, initialState, node);
      return {
        solvable: true,
        pushOptimal: true,
        solution,
        moves: solution.length,
        pushes,
        nodes,
        timeMs: elapsed(),
        deadlockReason: null,
      };
    }

    let candidates = legalPushes(board, node.state);

    for (const corral of findCorrals(board, node.state)) {
      if (corral.boxes.length === 0) continue;
      if (!isCorralUnsatisfied(board, node.state, corral)) continue;
      if (isPICorral(board, node.state, corral)) {
        const barrier = new Set(corral.boxes);
        candidates = candidates.filter((p) => barrier.has(p.box));
        break;
      }
    }

    for (const push of candidates) {
      const destination = neighbor(board, push.box, push.direction)!;
      if (deadSquares[destination]) continue;
      if (hasFreezeDeadlock(board, push.state.boxes)) continue;

      const bound = hungarianLowerBound(goalTables, push.state.boxes, board.goals);
      if (bound.deadlock) continue;

      const g2 = node.g + 1;
      const key2 = stateKey(board, push.state);
      if ((bestG.get(key2) ?? Infinity) <= g2) continue;
      bestG.set(key2, g2);

      open.push({
        state: push.state,
        g: g2,
        h: bound.value,
        parent: node,
        push: { box: push.box, direction: push.direction },
      });
    }
  }

  return {
    solvable: false,
    pushOptimal: false,
    solution: "",
    moves: 0,
    pushes: 0,
    nodes,
    timeMs: elapsed(),
    deadlockReason: "no_solution",
  };
}
