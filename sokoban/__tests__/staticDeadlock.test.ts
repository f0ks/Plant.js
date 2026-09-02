import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { computeDeadSquares } from "../deadlock/staticDeadlock";

describe("computeDeadSquares", () => {
  it("marks the goal itself as not dead", () => {
    const { board } = buildBoard(["#####", "#@$.#", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const dead = computeDeadSquares(board);
    expect(dead[idx(3, 1)]).toBe(0);
  });

  it("marks a square only reachable by a pull whose player-side is a wall as dead", () => {
    // Player at (1,1) can never receive a box by pushing, because pushing a
    // box onto (1,1) would require a player standing at (0,1), a wall.
    const { board } = buildBoard(["#####", "#@$.#", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const dead = computeDeadSquares(board);
    expect(dead[idx(1, 1)]).toBe(1);
  });

  it("marks a walled-off interior corner with no adjacent goal as dead", () => {
    const { board } = buildBoard(["######", "#.@  #", "#    #", "#    #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const dead = computeDeadSquares(board);
    // bottom-right interior corner: walls immediately right and below it
    expect(dead[idx(4, 3)]).toBe(1);
  });

  it("does not mark a mid-edge floor cell as dead when a box can be pushed along the wall to the goal", () => {
    const { board } = buildBoard(["######", "#.@  #", "#    #", "#    #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const dead = computeDeadSquares(board);
    // top row, next to the goal, only touches one wall (the ceiling)
    expect(dead[idx(2, 1)]).toBe(0);
  });

  it("never marks a wall cell in the returned mask", () => {
    const { board } = buildBoard(["#####", "#@$.#", "#####"]);
    const dead = computeDeadSquares(board);
    for (let i = 0; i < dead.length; i++) {
      if (board.walls[i]) expect(dead[i]).toBe(0);
    }
  });
});
