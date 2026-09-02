import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { DIRECTIONS } from "../state";
import { pushEvents, boxLines, boxChanges, countTouching, score, isAccepted } from "../metrics";

describe("pushEvents", () => {
  it("returns one event for a single push", () => {
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    const events = pushEvents(board, state, "R");
    expect(events).toEqual([{ boxIndex: 0, direction: DIRECTIONS.right }]);
  });

  it("emits nothing for pure walk moves before a push", () => {
    const { board, state } = buildBoard(["######", "#@ $ #", "######"]);
    const events = pushEvents(board, state, "rR");
    expect(events).toEqual([{ boxIndex: 0, direction: DIRECTIONS.right }]);
  });

  it("keeps the same boxIndex across two consecutive pushes of the same box", () => {
    const { board, state } = buildBoard(["######", "#@$  #", "######"]);
    const events = pushEvents(board, state, "RR");
    expect(events.map((e) => e.boxIndex)).toEqual([0, 0]);
  });

  it("assigns different boxIndex values to pushes of different boxes", () => {
    const { board, state } = buildBoard(["#######", "#@$ $ #", "#######"]);
    // push the near box right once, walk around, push the far box right once
    const events = pushEvents(board, state, "R" + "d" + "r" + "r" + "u" + "R");
    expect(events).toHaveLength(2);
    expect(events[0].boxIndex).not.toBe(events[1].boxIndex);
  });
});

describe("boxLines", () => {
  it("counts a single push as one line", () => {
    expect(boxLines([{ boxIndex: 0, direction: DIRECTIONS.right }])).toBe(1);
  });

  it("counts two consecutive pushes of the same box in the same direction as one line", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 0, direction: DIRECTIONS.right },
    ];
    expect(boxLines(events)).toBe(1);
  });

  it("counts two consecutive pushes of the same box in different directions as two lines", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 0, direction: DIRECTIONS.down },
    ];
    expect(boxLines(events)).toBe(2);
  });

  it("counts pushing two different boxes as two lines", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 1, direction: DIRECTIONS.right },
    ];
    expect(boxLines(events)).toBe(2);
  });

  it("counts returning to a box after pushing a different one as a new line, even if the direction repeats", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 1, direction: DIRECTIONS.right },
      { boxIndex: 0, direction: DIRECTIONS.right },
    ];
    expect(boxLines(events)).toBe(3);
  });
});

describe("boxChanges", () => {
  it("counts zero changes for a single push", () => {
    expect(boxChanges([{ boxIndex: 0, direction: DIRECTIONS.right }])).toBe(0);
  });

  it("counts zero changes for repeated pushes of the same box, regardless of direction", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 0, direction: DIRECTIONS.down },
    ];
    expect(boxChanges(events)).toBe(0);
  });

  it("counts one change when switching to a different box", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 1, direction: DIRECTIONS.right },
    ];
    expect(boxChanges(events)).toBe(1);
  });

  it("counts two changes for box A, then B, then back to A", () => {
    const events = [
      { boxIndex: 0, direction: DIRECTIONS.right },
      { boxIndex: 1, direction: DIRECTIONS.right },
      { boxIndex: 0, direction: DIRECTIONS.right },
    ];
    expect(boxChanges(events)).toBe(2);
  });
});

describe("countTouching", () => {
  it("counts a box touching a wall", () => {
    const { board, state } = buildBoard(["#####", "# @ #", "#$  #", "#   #", "#####"]);
    expect(countTouching(board, state).boxTouchingWall).toBe(1);
  });

  it("counts a box touching the player", () => {
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    expect(countTouching(board, state).boxTouchingPlayer).toBe(1);
  });

  it("counts a box touching another box", () => {
    const { board, state } = buildBoard(["######", "#@$$ #", "######"]);
    // the two adjacent boxes touch each other from both sides
    expect(countTouching(board, state).boxTouchingBox).toBe(2);
  });

  it("counts two goals touching each other", () => {
    const { board, state } = buildBoard(["######", "#@.. #", "######"]);
    expect(countTouching(board, state).goalTouchingGoal).toBe(2);
  });

  it("counts zero for a box and goal with no adjacent features", () => {
    const { board, state } = buildBoard([
      "#######",
      "#     #",
      "#@ $  #",
      "#     #",
      "#   . #",
      "#######",
    ]);
    const counts = countTouching(board, state);
    expect(counts.boxTouchingWall).toBe(0);
    expect(counts.boxTouchingPlayer).toBe(0);
    expect(counts.boxTouchingBox).toBe(0);
    expect(counts.goalTouchingGoal).toBe(0);
  });
});

describe("score", () => {
  const noTouching = { boxTouchingWall: 0, boxTouchingPlayer: 0, boxTouchingBox: 0, goalTouchingGoal: 0 };

  it("computes the base formula from pushes, lines, boxes, and sibling levels", () => {
    // Taylor & Parberry: 100 * (pushes - siblingLevels + 4*lines - 12*boxes)
    const result = score({
      pushes: 10,
      lines: 5,
      boxes: 1,
      siblingLevels: 2,
      trapped: false,
      touching: noTouching,
      random: 0,
    });
    expect(result).toBe(100 * (10 - 2 + 4 * 5 - 12 * 1));
  });

  it("adds the random jitter term", () => {
    const result = score({
      pushes: 1,
      lines: 1,
      boxes: 1,
      siblingLevels: 0,
      trapped: false,
      touching: noTouching,
      random: 123,
    });
    expect(result).toBe(100 * (1 + 4 - 12) + 123);
  });

  it("applies the wall-touch penalty per touching box", () => {
    const base = score({
      pushes: 1,
      lines: 1,
      boxes: 1,
      siblingLevels: 0,
      trapped: false,
      touching: noTouching,
      random: 0,
    });
    const withWallTouch = score({
      pushes: 1,
      lines: 1,
      boxes: 1,
      siblingLevels: 0,
      trapped: false,
      touching: { ...noTouching, boxTouchingWall: 2 },
      random: 0,
    });
    expect(withWallTouch).toBe(base - 150 * 2);
  });

  it("adds the player/box/goal touch bonuses", () => {
    const base = score({
      pushes: 1,
      lines: 1,
      boxes: 1,
      siblingLevels: 0,
      trapped: false,
      touching: noTouching,
      random: 0,
    });
    const withBonuses = score({
      pushes: 1,
      lines: 1,
      boxes: 1,
      siblingLevels: 0,
      trapped: false,
      touching: { boxTouchingWall: 0, boxTouchingPlayer: 1, boxTouchingBox: 1, goalTouchingGoal: 1 },
      random: 0,
    });
    expect(withBonuses).toBe(base + 50 + 30 + 30);
  });

  it("applies a large penalty when a trapped box is present", () => {
    const result = score({
      pushes: 1,
      lines: 1,
      boxes: 1,
      siblingLevels: 0,
      trapped: true,
      touching: noTouching,
      random: 0,
    });
    expect(result).toBe(100 * (1 + 4 - 12) - 100000);
  });
});

describe("isAccepted", () => {
  it("accepts a positive score", () => {
    expect(isAccepted(1)).toBe(true);
  });

  it("rejects a score of exactly zero", () => {
    expect(isAccepted(0)).toBe(false);
  });

  it("rejects a negative score", () => {
    expect(isAccepted(-1)).toBe(false);
  });
});
