import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import type { Board } from "../board";
import type { State } from "../state";
import { solve } from "../solver";
import { computeGoalDistanceTables, hungarianLowerBound } from "../heuristic";

/** Replays a full u/d/l/r (case = push) solution string and returns the final state, or throws on an illegal step. */
function replay(board: Board, initial: State, solution: string): State {
  const DIRS: Record<string, { dx: number; dy: number }> = {
    u: { dx: 0, dy: -1 },
    d: { dx: 0, dy: 1 },
    l: { dx: -1, dy: 0 },
    r: { dx: 1, dy: 0 },
  };
  let player = initial.player;
  let boxes = [...initial.boxes];

  for (const ch of solution) {
    const dir = DIRS[ch.toLowerCase()];
    if (!dir) throw new Error(`unexpected character ${ch}`);
    const x = player % board.width;
    const y = (player - x) / board.width;
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) {
      throw new Error(`walked off the board at ${ch}`);
    }
    const target = ny * board.width + nx;
    if (board.walls[target]) throw new Error(`walked into a wall at ${ch}`);

    const boxIndex = boxes.indexOf(target);
    if (boxIndex === -1) {
      // plain walk
      if (ch !== ch.toLowerCase()) throw new Error(`push letter ${ch} but no box at destination`);
      player = target;
      continue;
    }

    // push: box must move one further in the same direction
    if (ch !== ch.toUpperCase()) throw new Error(`walked into a box without pushing at ${ch}`);
    const bx = target % board.width;
    const by = (target - bx) / board.width;
    const beyond = { x: bx + dir.dx, y: by + dir.dy };
    if (beyond.x < 0 || beyond.x >= board.width || beyond.y < 0 || beyond.y >= board.height) {
      throw new Error(`pushed a box off the board at ${ch}`);
    }
    const beyondCell = beyond.y * board.width + beyond.x;
    if (board.walls[beyondCell] || boxes.includes(beyondCell)) {
      throw new Error(`pushed a box into a wall/box at ${ch}`);
    }
    boxes[boxIndex] = beyondCell;
    player = target;
  }

  return { player, boxes: boxes.sort((a, b) => a - b) };
}

function isSolved(board: Board, state: State): boolean {
  return state.boxes.every((b) => board.isGoal[b] === 1);
}

describe("solve", () => {
  it("reports an already-solved level as solved with an empty solution", () => {
    const { board, state } = buildBoard(["#####", "#@ *#", "#####"]);
    const result = solve(board, state);
    expect(result.solvable).toBe(true);
    expect(result.pushes).toBe(0);
    expect(result.solution).toBe("");
  });

  it("solves a trivial one-push level", () => {
    const { board, state } = buildBoard(["#####", "#@$.#", "#####"]);
    const result = solve(board, state);

    expect(result.solvable).toBe(true);
    expect(result.pushOptimal).toBe(true);
    expect(result.pushes).toBe(1);

    const final = replay(board, state, result.solution);
    expect(isSolved(board, final)).toBe(true);
  });

  it("solves a level that requires walking around before the push", () => {
    const { board, state } = buildBoard(["######", "#    #", "#@$ .#", "#    #", "######"]);
    const result = solve(board, state);

    expect(result.solvable).toBe(true);
    expect(result.pushes).toBeGreaterThanOrEqual(1);

    const final = replay(board, state, result.solution);
    expect(isSolved(board, final)).toBe(true);
    expect(result.moves).toBe(result.solution.length);
  });

  it("finds the push-optimal solution, matching the admissible lower bound exactly", () => {
    // a single box with no obstacles: the Hungarian lower bound (push
    // distance to its nearest goal) is exactly achievable here, so a
    // push-optimal solver's actual push count must equal it precisely --
    // a solver that finds *a* solution but not the *optimal* one would
    // overshoot this.
    const { board, state } = buildBoard(["#######", "#@$  .#", "#.    #", "#######"]);
    const tables = computeGoalDistanceTables(board);
    const lowerBound = hungarianLowerBound(tables, state.boxes, board.goals);
    expect(lowerBound.deadlock).toBe(false);

    const result = solve(board, state);
    expect(result.solvable).toBe(true);
    expect(result.pushes).toBe(lowerBound.value);
  });

  it("reports a bipartite deadlock when a box can never reach any goal", () => {
    const { board, state } = buildBoard(["#####", "#@$ #", "#####", "#. .#", "#####"]);
    const result = solve(board, state);
    expect(result.solvable).toBe(false);
    expect(result.deadlockReason).toBe("bipartite");
  });

  it("reports no_solution for a box permanently stuck off-goal (freeze deadlock)", () => {
    const { board, state } = buildBoard(["######", "#.@  #", "#    #", "#   $#", "######"]);
    const result = solve(board, state);
    expect(result.solvable).toBe(false);
  });

  it("times out gracefully with a tiny timeout budget", () => {
    const { board, state } = buildBoard(["######", "#    #", "#@$ .#", "#    #", "######"]);
    const result = solve(board, state, { timeoutMs: 0 });
    expect(result.solvable).toBe(false);
    expect(result.deadlockReason).toBe("timeout");
  });

  it("rejects a level where box count doesn't match goal count without crashing", () => {
    const { board, state } = buildBoard(["######", "#@$$ #", "#.   #", "######"]);
    const result = solve(board, state);
    expect(result.solvable).toBe(false);
    expect(result.deadlockReason).toBeTruthy();
  });
});
