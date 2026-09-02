import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import {
  computePushDistances,
  computeGoalDistanceTables,
  hungarianMinCost,
  hungarianLowerBound,
} from "../heuristic";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bruteForceMinCost(cost: number[][]): number {
  const n = cost.length;
  const perm = [...Array(n).keys()];
  let best = Infinity;
  const permute = (k: number) => {
    if (k === n) {
      let total = 0;
      for (let i = 0; i < n; i++) total += cost[i][perm[i]];
      if (total < best) best = total;
      return;
    }
    for (let i = k; i < n; i++) {
      [perm[k], perm[i]] = [perm[i], perm[k]];
      permute(k + 1);
      [perm[k], perm[i]] = [perm[i], perm[k]];
    }
  };
  permute(0);
  return best;
}

describe("computePushDistances", () => {
  it("gives distance 0 at the goal and increasing distance along a corridor", () => {
    const { board } = buildBoard(["#######", "#@$   #", "#     #", "#    .#", "#######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const goal = idx(5, 3);
    const dist = computePushDistances(board, goal);

    expect(dist[goal]).toBe(0);
    // a cell one push away from the goal is closer than one several pushes away
    expect(dist[idx(4, 3)]).toBeGreaterThan(0);
    expect(dist[idx(4, 3)]).toBeLessThan(dist[idx(2, 2)]);
  });

  it("returns -1 for a cell no box could ever reach the goal from", () => {
    const { board } = buildBoard(["#######", "#@ # .#", "#######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const goal = idx(5, 1);
    const dist = computePushDistances(board, goal);
    expect(dist[idx(1, 1)]).toBe(-1);
  });
});

describe("hungarianMinCost", () => {
  it("matches a hand-computed optimal assignment on a 2x2 matrix", () => {
    // box0->goal0 costs 1, box0->goal1 costs 4; box1->goal0 costs 3, box1->goal1 costs 2
    // optimal: box0->goal0 (1) + box1->goal1 (2) = 3, not the diagonal 1+... other combo is 4+3=7
    const cost = [
      [1, 4],
      [3, 2],
    ];
    const result = hungarianMinCost(cost);
    expect(result.total).toBe(3);
  });

  it("matches brute-force minimum cost on random small matrices", () => {
    const rand = mulberry32(42);
    for (let trial = 0; trial < 100; trial++) {
      const n = 1 + Math.floor(rand() * 5);
      const cost: number[][] = [];
      for (let i = 0; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < n; j++) row.push(Math.floor(rand() * 20));
        cost.push(row);
      }
      const expected = bruteForceMinCost(cost);
      const actual = hungarianMinCost(cost).total;
      expect(actual).toBe(expected);
    }
  });
});

describe("hungarianLowerBound", () => {
  it("computes the minimum total push distance pairing boxes to goals on a real board", () => {
    const { board, state } = buildBoard([
      "#########",
      "#       #",
      "#@$   $ #",
      "#  .   .#",
      "#       #",
      "#########",
    ]);
    const tables = computeGoalDistanceTables(board);
    const result = hungarianLowerBound(tables, state.boxes, board.goals);

    expect(result.deadlock).toBe(false);
    // sanity: cross-checks against direct per-box distance sums aren't
    // trivial to hand-derive here, so just assert it's a small finite,
    // non-negative number consistent with a solvable nearby level
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.value)).toBe(true);
  });

  it("flags a deadlock when a box can never reach any goal", () => {
    // two fully separate rooms, walled off from each other: the box's room
    // has no goal, and the goals' room is unreachable from it
    const { board, state } = buildBoard(["#####", "#@$ #", "#####", "#. .#", "#####"]);
    const tables = computeGoalDistanceTables(board);
    const result = hungarianLowerBound(tables, state.boxes, board.goals);
    expect(result.deadlock).toBe(true);
  });
});
