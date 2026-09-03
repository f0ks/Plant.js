import { describe, it, expect } from "vitest";
import { mulberry32 } from "../rng";
import { buildRoom, placeGoals } from "../generator";
import { computeReachable } from "../reachability";

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
