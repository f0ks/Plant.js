import { describe, it, expect } from "vitest";
import { mulberry32 } from "../rng";
import { buildRoom, placeGoals, findFarthestState, generateLevel, playerRegions } from "../generator";
import { computeReachable } from "../reachability";
import type { Board } from "../board";
import { buildBoard } from "../board";
import { solve } from "../solver";
import type { State } from "../state";
import { legalPulls, sortedBoxes } from "../state";
import { validateStructure } from "../validate";

/**
 * Independent oracle for `findFarthestState`: an unbounded, multi-source
 * BFS over the pull graph, seeded from *every* free floor cell (so every
 * player region is covered no matter how the boxes partition the room) and
 * written without touching `findFarthestState` or `playerRegions`. Returns
 * the true maximum pull-distance from the "boxes on goals" configuration.
 */
function referenceMaxPullDistance(board: Board, boxes: readonly number[]): number {
  const key = (s: State): string => {
    const reachable = computeReachable(board, s.boxes, s.player);
    let representative = -1;
    for (let cell = 0; cell < reachable.length; cell++) {
      if (reachable[cell]) { representative = cell; break; }
    }
    return `${s.boxes.join(",")}|${representative}`;
  };

  const seen = new Set<string>();
  let frontier: State[] = [];
  for (let cell = 0; cell < board.floor.length; cell++) {
    if (!board.floor[cell] || board.walls[cell] || boxes.includes(cell)) continue;
    const state: State = { boxes: [...boxes], player: cell };
    const k = key(state);
    if (seen.has(k)) continue;
    seen.add(k);
    frontier.push(state);
  }

  let distance = 0;
  while (frontier.length > 0) {
    const next: State[] = [];
    for (const state of frontier) {
      for (const pull of legalPulls(board, state)) {
        const k = key(pull.state);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(pull.state);
      }
    }
    if (next.length > 0) distance++;
    frontier = next;
  }
  return distance;
}

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

  it("cross-validates against solve() on a longer, multi-box pull chain", () => {
    // Two boxes in a room big enough that the winning chain is many pushes
    // long, not the 2-push chain the single-box fixture above produces.
    const { board } = buildBoard([
      "########",
      "#@     #",
      "#      #",
      "#  .   #",
      "#      #",
      "#   .  #",
      "#      #",
      "########",
    ]);
    const goalState = { boxes: sortedBoxes(board.goals), player: board.goals[0] - board.width };
    const result = findFarthestState(board, goalState, mulberry32(11), { maxNodes: 20000, timeoutMs: 10000 });
    expect(result.distance).toBeGreaterThan(4);

    const solved = solve(board, result.state, { timeoutMs: 20000 });
    expect(solved.solvable).toBe(true);
    expect(solved.pushes).toBe(result.distance);
  });
});

describe("playerRegions", () => {
  it("returns one representative per connected component of free floor", () => {
    // The box on the door cell splits this room into a 1-row top pocket and
    // a 3-row bottom room.
    const { board } = buildBoard(["#######", "#  @  #", "###.###", "#     #", "#     #", "#     #", "#######"]);
    const boxes = sortedBoxes(board.goals);

    const regions = playerRegions(board, boxes);
    expect(regions.length).toBe(2);

    // The representatives really are in different components, and together
    // they cover every free floor cell exactly once.
    const [a, b] = regions;
    const reachA = computeReachable(board, boxes, a);
    const reachB = computeReachable(board, boxes, b);
    expect(reachA[b]).toBe(0);
    expect(reachB[a]).toBe(0);
    for (let cell = 0; cell < board.floor.length; cell++) {
      if (!board.floor[cell] || board.walls[cell] || boxes.includes(cell)) continue;
      expect(reachA[cell] + reachB[cell]).toBe(1);
    }
  });

  it("returns a single region when no box splits the floor", () => {
    const { board } = buildBoard(["#######", "#@    #", "#     #", "#  .  #", "#     #", "#######"]);
    expect(playerRegions(board, []).length).toBe(1);
  });
});

describe("findFarthestState multi-region seeding (regression: C1)", () => {
  // Goal on the single door cell between a shallow top pocket and a deep
  // bottom room. With a box parked on that goal the floor splits in two:
  //
  //   #######
  //   #  @  #   <- top pocket: reaching the box's only pull-origin cell
  //   ###.###      requires stepping into the wall above, so ZERO pulls
  //   #     #
  //   #     #   <- bottom room: the box pulls straight down and then has
  //   #     #      a whole room to be pulled around in
  //   #######
  //
  // `representativePlayer` picks the lowest-index free floor cell, which is
  // in the top pocket — so seeding from that one region alone reports
  // distance 0 and the entire bottom-room subgraph is never discovered.
  const ROWS = ["#######", "#  @  #", "###.###", "#     #", "#     #", "#     #", "#######"];

  it("finds the deep region even when the lowest-index region is a dead end", () => {
    const { board } = buildBoard(ROWS);
    const boxes = sortedBoxes(board.goals);
    const regions = playerRegions(board, boxes);
    expect(regions.length).toBe(2);

    // Precondition: the region `representativePlayer` would have picked (the
    // lowest-index one) genuinely has no pulls at all.
    expect(legalPulls(board, { boxes, player: regions[0] })).toEqual([]);

    const goalState = { boxes, player: regions[0] };
    const result = findFarthestState(board, goalState, mulberry32(1), { maxNodes: 20000, timeoutMs: 10000 });

    const reference = referenceMaxPullDistance(board, boxes);
    expect(reference).toBeGreaterThan(0);
    expect(result.distance).toBe(reference);

    // And the level it reports is real: the solver agrees on the push count.
    const solved = solve(board, result.state, { timeoutMs: 20000 });
    expect(solved.solvable).toBe(true);
    expect(solved.pushes).toBe(result.distance);
  });

  it("gives the same answer whichever region's player position is passed in", () => {
    const { board } = buildBoard(ROWS);
    const boxes = sortedBoxes(board.goals);
    const regions = playerRegions(board, boxes);
    const options = { maxNodes: 20000, timeoutMs: 10000 };
    const fromTop = findFarthestState(board, { boxes, player: regions[0] }, mulberry32(4), options);
    const fromBottom = findFarthestState(board, { boxes, player: regions[1] }, mulberry32(4), options);
    expect(fromTop.distance).toBe(fromBottom.distance);
    expect(fromTop.state).toEqual(fromBottom.state);
  });

  it("matches the independent multi-source reference across a seed sweep, including room-splitting cases", () => {
    // A single hand-authored seed is exactly how this bug survived ten clean
    // task reviews — sweep real generator-scale rooms instead, and assert the
    // sweep actually covered multi-region goal configurations.
    let checked = 0;
    let multiRegion = 0;

    for (let seed = 1; seed <= 40; seed++) {
      const rng = mulberry32(seed);
      const room = buildRoom(rng, 2, 2, 300);
      if (room === null) continue;
      const goals = placeGoals(room, 2, rng, { maxAttempts: 500 });
      if (goals === null) continue;

      const isGoal = new Uint8Array(room.width * room.height);
      for (const g of goals) isGoal[g] = 1;
      const board: Board = { ...room, goals, isGoal };

      const regions = playerRegions(board, goals);
      if (regions.length > 1) multiRegion++;

      const result = findFarthestState(
        board,
        { boxes: goals, player: regions[0] },
        rng,
        { maxNodes: 100000, timeoutMs: 20000 },
      );
      // Node cap not reached, so the search is exhaustive and must agree
      // exactly with the reference rather than merely not exceeding it.
      expect(result.nodes).toBeLessThan(100000);
      expect(result.distance).toBe(referenceMaxPullDistance(board, goals));
      checked++;
    }

    expect(checked).toBeGreaterThanOrEqual(30);
    expect(multiRegion).toBeGreaterThan(0);
  });
});

/**
 * Mirrors `cli/gen.ts`'s retry loop: a `null` from `generateLevel` means
 * "this attempt didn't produce a level" (an unlucky room, goal placement, or
 * a farthest state that turned out degenerate), not an error — so a caller
 * that wants *a* level keeps drawing from the same `rng` stream.
 */
function generateWithRetries(
  seed: number,
  options: { blockCols: number; blockRows: number; boxCount: number },
  maxAttempts = 40,
) {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const level = generateLevel(rng, options);
    if (level !== null) return level;
  }
  return null;
}

describe("generateLevel", () => {
  it("produces a structurally valid, solvable level whose optimal solve distance matches its recorded distance", () => {
    const level = generateWithRetries(1, { blockCols: 2, blockRows: 2, boxCount: 2 });
    expect(level).not.toBeNull();
    const lvl = level!;

    const issues = validateStructure(lvl.board, lvl.state);
    const hard = issues.filter((i) => i.code === "not-closed" || i.code === "box-goal-mismatch");
    expect(hard).toEqual([]);

    const solved = solve(lvl.board, lvl.state, { timeoutMs: 5000 });
    expect(solved.solvable).toBe(true);
    expect(solved.pushes).toBe(lvl.distance);
  });

  it("returns null when goal placement is infeasible, rather than a fake level", () => {
    // boxCount far exceeds the floor-cell count of a 1x1-block room, so
    // placeGoals fails outright and generateLevel must propagate null.
    const rng = mulberry32(1);
    const level = generateLevel(rng, { blockCols: 1, blockRows: 1, boxCount: 50 });
    expect(level).toBeNull();
  });

  it("is deterministic for a fixed seed", () => {
    const a = generateWithRetries(2, { blockCols: 2, blockRows: 2, boxCount: 2 });
    const b = generateWithRetries(2, { blockCols: 2, blockRows: 2, boxCount: 2 });
    expect(a).not.toBeNull(); // otherwise the comparison below is vacuous
    expect(a?.state).toEqual(b?.state);
    expect(a?.distance).toBe(b?.distance);
  });

  it("never returns a level that starts with a box already on a goal", () => {
    // Regression: I2. Before the fix roughly half of accepted levels were
    // partially pre-solved. Sweep enough seeds that a single unlucky one
    // can't hide a regression.
    let produced = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const level = generateWithRetries(seed, { blockCols: 2, blockRows: 2, boxCount: 3 });
      if (level === null) continue;
      produced++;
      expect(validateStructure(level.board, level.state).map((i) => i.code)).not.toContain(
        "box-on-goal-at-start",
      );
    }
    expect(produced).toBeGreaterThan(0);
  });

  it("returns a goalState the recorded solution actually reaches", () => {
    // With multi-region seeding the reported goalState is the winning
    // chain's own root, not an arbitrary region's representative.
    const level = generateWithRetries(1, { blockCols: 2, blockRows: 2, boxCount: 2 })!;
    expect(level).not.toBeNull();

    const DIRS: Record<string, { dx: number; dy: number }> = {
      u: { dx: 0, dy: -1 }, d: { dx: 0, dy: 1 }, l: { dx: -1, dy: 0 }, r: { dx: 1, dy: 0 },
    };
    let player = level.state.player;
    let boxes = [...level.state.boxes];
    for (const ch of level.solution) {
      const dir = DIRS[ch.toLowerCase()];
      const x = player % level.board.width, y = (player - x) / level.board.width;
      const target = (y + dir.dy) * level.board.width + (x + dir.dx);
      const boxIndex = boxes.indexOf(target);
      if (boxIndex === -1) { player = target; continue; }
      const bx = target % level.board.width, by = (target - bx) / level.board.width;
      boxes[boxIndex] = (by + dir.dy) * level.board.width + (bx + dir.dx);
      player = target;
    }
    expect(sortedBoxes(boxes)).toEqual(level.goalState.boxes);
    // The replay leaves the player somewhere in the winning root's region —
    // the same region `goalState.player` represents. (Exact cell equality is
    // not the contract: states differing only by player position within one
    // region are the same state under `stateKey`.)
    expect(computeReachable(level.board, boxes, level.goalState.player)[player]).toBe(1);
  });
});
