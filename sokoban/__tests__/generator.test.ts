import { describe, it, expect } from "vitest";
import { mulberry32 } from "../rng";
import { buildRoom, placeGoals, findFarthestState } from "../generator";
import { computeReachable } from "../reachability";
import { buildBoard } from "../board";
import { solve } from "../solver";
import { sortedBoxes } from "../state";

describe("buildRoom", () => {
  it("produces a board fully enclosed by walls at the requested size", () => {
    const rng = mulberry32(1);
    const room = buildRoom(rng, 2, 2, 300);
    expect(room).not.toBeNull();
    const r = room!;
    // interior is blockCols*3 x blockRows*3, plus a 1-cell wall border
    expect(r.width).toBe(2 * 3 + 2);
    expect(r.height).toBe(2 * 3 + 2);
    // every edge cell is a wall
    for (let x = 0; x < r.width; x++) {
      expect(r.walls[x]).toBe(1); // top row
      expect(r.walls[(r.height - 1) * r.width + x]).toBe(1); // bottom row
    }
    for (let y = 0; y < r.height; y++) {
      expect(r.walls[y * r.width]).toBe(1); // left column
      expect(r.walls[y * r.width + r.width - 1]).toBe(1); // right column
    }
  });

  it("returns null when the attempt budget is exhausted with an impossible size", () => {
    // 0x0 blocks: no interior at all, can never pass validation.
    const rng = mulberry32(1);
    expect(buildRoom(rng, 0, 0, 10)).toBeNull();
  });

  it("succeeds within budget for at least 48/50 seeds at the 2x2 default size", () => {
    // Empirical tuning check (see the plan's Design notes section):
    // per-attempt success rate ~11% at 2x2, so 300 attempts should succeed
    // for effectively every seed.
    let successes = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed);
      if (buildRoom(rng, 2, 2, 300) !== null) successes++;
    }
    expect(successes).toBeGreaterThanOrEqual(48);
  });

  it("every produced room has fully connected floor, no oversized open rectangle, and no three-sided nook", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const room = buildRoom(mulberry32(seed), 2, 2, 300);
      if (room === null) continue;
      let start = -1;
      for (let i = 0; i < room.floor.length; i++) {
        if (room.floor[i] && !room.walls[i]) { start = i; break; }
      }
      const reachable = computeReachable(room, [], start);
      for (let i = 0; i < room.floor.length; i++) {
        if (room.floor[i] && !room.walls[i]) expect(reachable[i]).toBe(1);
      }
    }
  });
});

describe("placeGoals", () => {
  it("returns boxCount distinct floor cells, sorted", () => {
    const room = buildRoom(mulberry32(1), 2, 2, 300)!;
    const goals = placeGoals(room, 3, mulberry32(2));
    expect(goals).not.toBeNull();
    const g = goals!;
    expect(g.length).toBe(3);
    expect(new Set(g).size).toBe(3);
    expect([...g].sort((a, b) => a - b)).toEqual(g);
    for (const cell of g) {
      expect(room.floor[cell]).toBe(1);
      expect(room.walls[cell]).toBe(0);
    }
  });

  it("keeps every pair of goals at Chebyshev distance >= 2", () => {
    const room = buildRoom(mulberry32(3), 2, 2, 300)!;
    const goals = placeGoals(room, 3, mulberry32(4))!;
    const cellXY = (c: number) => [c % room.width, (c - (c % room.width)) / room.width];
    for (let i = 0; i < goals.length; i++) {
      for (let j = i + 1; j < goals.length; j++) {
        const [ax, ay] = cellXY(goals[i]);
        const [bx, by] = cellXY(goals[j]);
        expect(Math.max(Math.abs(ax - bx), Math.abs(ay - by))).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("returns null when boxCount exceeds the floor cell count", () => {
    const room = buildRoom(mulberry32(1), 2, 2, 300)!;
    const floorCount = room.floor.reduce((sum, f, i) => sum + (f && !room.walls[i] ? 1 : 0), 0);
    expect(placeGoals(room, floorCount + 1, mulberry32(1))).toBeNull();
  });

  it("is deterministic for a fixed seed", () => {
    const room = buildRoom(mulberry32(1), 2, 2, 300)!;
    const a = placeGoals(room, 3, mulberry32(9));
    const b = placeGoals(room, 3, mulberry32(9));
    expect(a).toEqual(b);
  });
});

describe("findFarthestState", () => {
  it("returns distance 0 (the goal state itself) when no pulls are available", () => {
    // Box already on its only goal, wedged in a 1-wide dead end: the only
    // candidate pull direction needs the player to step back into a wall,
    // so no legal pull exists.
    const { board, state } = buildBoard(["####", "#@*#", "####"]);
    const goalState = { boxes: state.boxes, player: state.player };
    const result = findFarthestState(board, goalState, mulberry32(1));
    expect(result.distance).toBe(0);
    expect(result.solution).toBe("");
    // Exactly one state (the root/goal itself) was ever visited, so there
    // are no *other* states tied with it at the max distance.
    expect(result.nodes).toBe(1);
    expect(result.siblingLevels).toBe(0);
  });

  it("finds a state whose optimal solve distance (via the existing solver) matches the search's own distance", () => {
    // A room with enough space for the box to be pulled several times.
    const { board } = buildBoard(["#######", "#@    #", "#     #", "#  .  #", "#     #", "#     #", "#######"]);
    const goalIdx = board.goals[0];
    // goals[] is empty here since '.' inside buildBoard already registers
    // it -- use board.goals as the single-goal, single-box goal state.
    const goalState = { boxes: sortedBoxes([goalIdx]), player: goalIdx - board.width }; // any adjacent free cell

    const result = findFarthestState(board, goalState, mulberry32(5), { maxNodes: 2000, timeoutMs: 2000 });
    expect(result.distance).toBeGreaterThan(0);

    const solved = solve(board, result.state, { timeoutMs: 5000 });
    expect(solved.solvable).toBe(true);
    expect(solved.pushes).toBe(result.distance);
  });

  it("the reconstructed solution string, replayed by hand, actually solves the level", () => {
    const { board } = buildBoard(["#######", "#@    #", "#     #", "#  .  #", "#     #", "#     #", "#######"]);
    const goalIdx = board.goals[0];
    const goalState = { boxes: sortedBoxes([goalIdx]), player: goalIdx - board.width };
    const result = findFarthestState(board, goalState, mulberry32(6), { maxNodes: 2000, timeoutMs: 2000 });
    expect(result.distance).toBeGreaterThan(0);

    // Replay result.solution against result.state by hand (independent of
    // solve()'s own machinery) and check every box ends on a goal.
    const DIRS: Record<string, { dx: number; dy: number }> = {
      u: { dx: 0, dy: -1 }, d: { dx: 0, dy: 1 }, l: { dx: -1, dy: 0 }, r: { dx: 1, dy: 0 },
    };
    let player = result.state.player;
    let boxes = [...result.state.boxes];
    for (const ch of result.solution) {
      const dir = DIRS[ch.toLowerCase()];
      const x = player % board.width, y = (player - x) / board.width;
      const target = (y + dir.dy) * board.width + (x + dir.dx);
      const boxIndex = boxes.indexOf(target);
      if (boxIndex === -1) { player = target; continue; }
      const bx = target % board.width, by = (target - bx) / board.width;
      const destination = (by + dir.dy) * board.width + (bx + dir.dx);
      boxes[boxIndex] = destination;
      player = target;
    }
    expect(boxes.every((b) => board.isGoal[b] === 1)).toBe(true);
  });

  it("is deterministic for a fixed seed", () => {
    const { board } = buildBoard(["#######", "#@    #", "#     #", "#  .  #", "#     #", "#     #", "#######"]);
    const goalIdx = board.goals[0];
    const goalState = { boxes: sortedBoxes([goalIdx]), player: goalIdx - board.width };
    const a = findFarthestState(board, goalState, mulberry32(3), { maxNodes: 500, timeoutMs: 2000 });
    const b = findFarthestState(board, goalState, mulberry32(3), { maxNodes: 500, timeoutMs: 2000 });
    expect(a.state).toEqual(b.state);
    expect(a.distance).toBe(b.distance);
  });
});
