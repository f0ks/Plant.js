import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { isFrozen, hasFreezeDeadlock } from "../deadlock/freezeDeadlock";

describe("isFrozen", () => {
  it("is frozen for a box in a walled interior corner (both axes blocked by walls)", () => {
    const { board } = buildBoard(["######", "#.@  #", "#    #", "#   $#", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(4, 3);
    expect(isFrozen(board, [box], box)).toBe(true);
  });

  it("is not frozen for a box in the open middle of a room", () => {
    const { board } = buildBoard(["######", "#@   #", "#  $ #", "#    #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(3, 2);
    expect(isFrozen(board, [box], box)).toBe(false);
  });

  it("is not frozen for a box against a single wall when it can still slide along that wall", () => {
    const { board } = buildBoard(["######", "#@   #", "#$   #", "#    #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(1, 2);
    // west wall blocks the horizontal axis entirely, but the box can still
    // be pushed north/south along the wall
    expect(isFrozen(board, [box], box)).toBe(false);
  });

  it("is frozen for a box pinned in a 1-wide dead-end pocket (both axes blocked by walls)", () => {
    // box has walls directly left/right (horizontal fully blocked) and,
    // although there's open floor above, the cell directly below it is a
    // wall -- which is also the required player-standing cell for pushing
    // the box up -- so vertical is blocked too, purely structurally.
    const { board } = buildBoard(["#####", "#@  #", "#   #", "## ##", "##$##", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(2, 4);
    expect(isFrozen(board, [box], box)).toBe(true);
  });

  it("is frozen for every box in a 2x2 block sitting in open space (mutual box-on-box freeze)", () => {
    const { board } = buildBoard([
      "##########",
      "#@       #",
      "#        #",
      "#   $$   #",
      "#   $$   #",
      "#        #",
      "##########",
    ]);
    const idx = (x: number, y: number) => y * board.width + x;
    const boxes = [idx(4, 3), idx(5, 3), idx(4, 4), idx(5, 4)];
    for (const box of boxes) {
      expect(isFrozen(board, boxes, box)).toBe(true);
    }
  });
});

describe("hasFreezeDeadlock", () => {
  it("is true when a frozen box is not on a goal", () => {
    const { board } = buildBoard(["######", "#.@  #", "#    #", "#   $#", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(4, 3);
    expect(hasFreezeDeadlock(board, [box])).toBe(true);
  });

  it("is false for a frozen box on a goal", () => {
    const { board } = buildBoard(["######", "#.@  #", "#    #", "#   *#", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(4, 3);
    expect(board.isGoal[box]).toBe(1);
    expect(hasFreezeDeadlock(board, [box])).toBe(false);
  });

  it("is false when no box is frozen", () => {
    const { board } = buildBoard(["######", "#@   #", "#  $ #", "#    #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(hasFreezeDeadlock(board, [idx(3, 2)])).toBe(false);
  });
});
