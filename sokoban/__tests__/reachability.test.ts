import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { computeReachable } from "../reachability";

describe("computeReachable", () => {
  it("marks every open floor cell reachable in an empty room", () => {
    const { board, state } = buildBoard(["####", "#@ #", "####"]);
    const reachable = computeReachable(board, state.boxes, state.player);

    const idx = (x: number, y: number) => y * board.width + x;
    expect(reachable[idx(1, 1)]).toBe(1); // player's own cell
    expect(reachable[idx(2, 1)]).toBe(1); // open floor next to it
    expect(reachable[idx(0, 0)]).toBe(0); // wall
  });

  it("does not mark cells occupied by boxes as reachable", () => {
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const reachable = computeReachable(board, state.boxes, state.player);

    expect(reachable[idx(2, 1)]).toBe(0); // the box's own cell
  });

  it("does not cross through a box to reach floor beyond it", () => {
    // #@$ .#  -- the only path to the goal is through the box
    const { board, state } = buildBoard(["######", "#@$ .#", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const reachable = computeReachable(board, state.boxes, state.player);

    expect(reachable[idx(4, 1)]).toBe(0);
  });

  it("stays within the player's connected component when rooms are walled off", () => {
    const { board, state } = buildBoard(["#######", "#@ # .#", "#######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const reachable = computeReachable(board, state.boxes, state.player);

    expect(reachable[idx(1, 1)]).toBe(1);
    expect(reachable[idx(5, 1)]).toBe(0);
  });

  it("can route around an obstacle, not just in a straight line", () => {
    const { board, state } = buildBoard(["#####", "#@#.#", "#   #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const reachable = computeReachable(board, state.boxes, state.player);

    expect(reachable[idx(3, 1)]).toBe(1);
  });
});
